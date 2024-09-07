const axios = require("axios");
const db = require("../models");
const { ServerConfig } = require("../config");
const { StatusCodes } = require("http-status-codes");
const AppError = require("../utils/errors/app-error");
const { BookingRepository } = require("../repositories");
const { Enums } = require("../utils/common");
const { BOOKED, CANCELED, INITIATED, PENDING } = Enums.BOOKING_STATUS;

const bookingRepository = new BookingRepository();

async function createBooking(data) {
  const transaction = await db.sequelize.transaction();
  try {
    const flight = await axios.get(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`
    );
    const flightData = flight.data.data;
    if (data.noOfSeats > flightData.totalSeats) {
      throw new AppError(
        "Not enough seats available.",
        StatusCodes.BAD_REQUEST
      );
    }
    const totalBillingAmount = data.noOfSeats * flightData.price;
    const bookingPayload = { ...data, totalCost: totalBillingAmount };
    const booking = await bookingRepository.createBooking(
      bookingPayload,
      transaction
    );

    await axios.patch(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}/seats`,
      {
        seats: data.noOfSeats,
      }
    );

    await transaction.commit();
    return booking;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function makePayment(data) {
  const transaction = await db.sequelize.transaction();
  try {
    const bookingDetails = await bookingRepository.getWithTransaction(
      data.bookingId,
      transaction
    );
    if (bookingDetails.status == CANCELED) {
      throw new AppError("The booking has Expired.", StatusCodes.BAD_REQUEST);
    }
    const bookingTime = new Date(bookingDetails.createdAt);
    const currentTime = new Date();
    if (currentTime - bookingTime > 300000) {
      await bookingRepository.updateWithTransaction(
        data.bookingId,
        { status: CANCELED },
        transaction
      );
      await cancelBooking(data.bookingId);
      throw new AppError("The booking has expired", StatusCodes.BAD_REQUEST);
    }
    if (bookingDetails.totalCost != data.totalCost) {
      throw new AppError(
        "The amount of the payment doesn't match",
        StatusCodes.BAD_REQUEST
      );
    }
    if (bookingDetails.userId != data.userId) {
      throw new AppError(
        "The user corresponding to the booking doesn't match",
        StatusCodes.BAD_REQUEST
      );
    }
    // we assume here that payment is successful
    await bookingRepository.updateWithTransaction(
      data.bookingId,
      { status: BOOKED },
      transaction
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function cancelBooking(bookingId) {
  const transaction = db.sequelize.transaction();
  try {
    const bookingDetails = await bookingRepository.getWithTransaction(
      bookingId,
      transaction
    );
    if (bookingDetails.status == CANCELED) {
      await transaction.commit();
      return true;
    }
    await axios(
      `${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${bookingDetails.flightId}/seats`,
      {
        seats: bookingDetails.noOfSeats,
        dec: 0,
      }
    );
    await bookingRepository.updateWithTransaction(
      bookingId,
      { status: CANCELED },
      transaction
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function cancelOldBookings() {
  try {
    const time = new Date(Date.now() - 1000 * 300); // time = 5 min ago
    const response = await bookingRepository.cancelOldBookings(time);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

module.exports = {
  createBooking,
  makePayment,
  cancelOldBookings,
};

const CrudRepository = require("./crud-repository");
const { Booking } = require("../models");
const AppError = require("../utils/errors/app-error");
const { StatusCodes } = require("http-status-codes");

class BookingRepository extends CrudRepository {
  constructor() {
    super(Booking);
  }

  async createBooking(data, transaction) {
    const response = await Booking.create(data, { transaction: transaction });
    return response;
  }

  async getWithTransaction(data, transaction) {
    const response = await this.model.findByPk(data, {
      transaction: transaction,
    });
    if (!response) {
      throw new AppError("Not able to fund resource.", StatusCodes.NOT_FOUND);
    }
    return response;
  }

  async updateWithTransaction(id, data, transaction) {
    const response = await this.model.update(
      data,
      { where: { id: id } },
      { transaction: transaction }
    );
    return response;
  }
}

module.exports = BookingRepository;

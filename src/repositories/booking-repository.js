const CrudRepository = require("./crud-repository");
const { Booking } = require("../models");
const AppError = require("../utils/errors/app-error");
const { StatusCodes } = require("http-status-codes");
const { Enums } = require("../utils/common");
const { Op } = require("sequelize");
const { BOOKED, CANCELED } = Enums.BOOKING_STATUS;

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

  async cancelOldBookings(timestamp) {
    const response = await Booking.update(
      { status: CANCELED },
      {
        where: {
          [Op.and]: [
            {
              createdAt: {
                [Op.lt]: timestamp,
              },
            },
            {
              status: {
                [Op.ne]: BOOKED,
              },
            },
            {
              status: {
                [Op.ne]: CANCELLED,
              },
            },
          ],
        },
      }
    );
    return response;
  }
}

module.exports = BookingRepository;

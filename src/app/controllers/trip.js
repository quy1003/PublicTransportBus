const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const Seat = require('../models/Seat');
const User = require('../models/User')
const zaloPayConfig = require('../config/zalopay');
const axios = require('axios').default; 
const CryptoJS = require('crypto-js'); 
const moment = require('moment'); 
const qs = require('qs');
class TripController {
  //[GET] - /trips/
  async listTrip(req, res) {
    try {
      const { page = 1 } = req.query;
      const pageSize = parseInt(process.env.PAGE_SIZE);

      const trips = await Trip.find()
        .populate('bus', 'name')
        .populate('route', 'name')
        .sort({ departureTime: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select('-seats');

      
      const totalTrips = await Trip.countDocuments();
      const totalPages = Math.ceil(totalTrips / pageSize);
      const currentPage = parseInt(page);

      const prevPage = currentPage > 1 ? currentPage - 1 : null;
      const nextPage = currentPage < totalPages ? currentPage + 1 : null;

      return res.status(200).json({
        totalTrips,
        totalPages,
        currentPage,
        prevPage,
        nextPage,
        trips,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get trips' });
    }
  }

  //[POST] - /trips/create-trip/
  async createTrip(req, res) {
    const { busId, routeId, departureTime, price, isReverse, driverId } = req.body;
    if (!Number(price)) {
      return res.status(500).json({ message: 'Giá tiền phải là số' });
    }
    
    try {
      const bus = await Bus.findById(busId).populate('seats');
      if (!bus) {
        return res.status(404).json({ message: 'Không tìm thấy bus với ID này' });
      }

      const driver = await User.findById(driverId);
      if (!driver) {
        return res.status(404).json({ message: 'Không tìm thấy driver với ID này' });
      }

      const route = await Route.findById(routeId);
      if (!route) {
        return res.status(404).json({ message: 'Không tìm thấy route với ID này' });
      }

      if (bus.route.toString() !== routeId.toString()) {
        return res.status(400).json({ message: 'Bus và tuyến đường không phải 1 cặp' });
      }

      const currentTime = new Date(departureTime)
      const thirtyMinutesBefore = new Date(currentTime.getTime() - 30 * 60 * 1000)
      const thirtyMinutesAfter = new Date(currentTime.getTime() + 30 * 60 * 1000)

      const existingTrip = await Trip.findOne({
        $or: [
          { bus: busId, departureTime: { $gte: thirtyMinutesBefore, $lte: thirtyMinutesAfter } },
          { driver: driverId, departureTime: { $gte: thirtyMinutesBefore, $lte: thirtyMinutesAfter } }
        ]
      });

      if (existingTrip) {
        return res.status(400).json({ message: 'Đã có chuyến xe trùng tài xế và xe trong khoảng 30 phút trước hoặc sau' });
      }

      const tripSeats = bus.seats.map((seat) => ({
        seat: seat._id,
        status: false,
      }));

      const newTrip = new Trip({
        bus: busId,
        route: routeId,
        departureTime: departureTime,
        seats: tripSeats,
        driver: driverId,
        price: price,
        isReverse: isReverse
      });

      await newTrip.save();

      return res.status(201).json({ message: 'Tạo mới trip thành công' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Không thể tạo trip mới', error });
    }
  }
  //[GET] /trips/:id
  async detailTrip(req, res) {
    try {
      const tripId = req.params.id;
      const trip = await Trip.findById(tripId)
      .populate('bus', 'name')
      .populate('route', 'name')
      .populate('seats.seat', 'name');

      return res.status(200).json(trip);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get trip' });
    }
  }

  //[POST] - /trips/:tripId/book-seat
  async bookSeats(req, res) {
    try {
      const tripId = req.params.tripId;
      const userId = req.user._id;
      const seatIds = req.body.seatIds;
      const trip = await Trip.findById(tripId);

      if (!trip || !seatIds || !userId || seatIds.length === 0) {
        return res.status(404).json({ message: 'Thiếu thông tin' });
      }

      const unavailableSeats = [];
      const seatsToBook = [];

      for (const seatId of seatIds) {
        const seatToBook = trip.seats.find((seat) => seat.seat._id == seatId);
        if (!seatToBook) {
          unavailableSeats.push(seatId);
          continue;
        }
        if (seatToBook.status == true) {
          unavailableSeats.push(seatId);
          continue;
        }
        seatsToBook.push(seatToBook);
      }

      if (unavailableSeats.length > 0) {
        return res.status(404).json({
          message: 'Một số ghế không thể đặt',
          unavailableSeats: unavailableSeats,
        });
      }

      const currentTime = new Date();
      // Demo tắt cái này
      // if (trip.departureTime < currentTime) {
      //   return res.status(404).json({ message: 'Chuyến xe này đã kết thúc' });
      // }
      const price = trip.price * seatIds.length;

      const embed_data = {
        userId,
        tripId,
        seatIds,
        redirectUrl:`http://localhost:3000/trips/${tripId}`
      };

      const items = seatIds.map((seatId) => ({ seatId }));
      const transID = Math.floor(Math.random() * 1000000);
      const order = {
        app_id: zaloPayConfig.app_id,
        app_trans_id: `${moment().format('YYMMDD')}_${transID}`,
        app_user: 'user123',
        app_time: Date.now(),
        item: JSON.stringify(items),
        embed_data: JSON.stringify(embed_data),
        amount: price,
        description: `Payment for order tickets #${transID}`,
        bank_code: '',
        callback_url: `https://89d1-2001-ee0-e9f5-1730-e0a1-77b0-b8d6-88e9.ngrok-free.app/callback`,
      };

      const data =
        zaloPayConfig.app_id +
        '|' +
        order.app_trans_id +
        '|' +
        order.app_user +
        '|' +
        order.amount +
        '|' +
        order.app_time +
        '|' +
        order.embed_data +
        '|' +
        order.item;
      order.mac = CryptoJS.HmacSHA256(data, zaloPayConfig.key1).toString();

      const result = await axios.post(zaloPayConfig.endpoint, null, {
        params: order,
      });

      return res.status(200).json(result.data);
    } catch (ex) {
      return res.status(500).json({ message: ex.message });
    }
  }
}

module.exports = new TripController();

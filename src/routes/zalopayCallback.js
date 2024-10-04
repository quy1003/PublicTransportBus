const express = require('express');
const router = express.Router();
const zaloPayConfig = require('../app/config/zalopay');
const axios = require('axios').default; // npm install axios
const CryptoJS = require('crypto-js'); // npm install crypto-js
const moment = require('moment'); // npm install moment
const qs = require('qs');
const Ticket = require('../app/models/Ticket');
const Trip = require('../app/models/Trip');
const User = require('../app/models/User')
// router.post('/', async(req, res) => {
//     let result = {};
//     const userId = req.query.userId
//     const tripId = req.query.tripId
//     const seatId = req.query.seatId
//     if(!userId || !tripId || !seatId){
//       return res.status(404).json({message: 'Không tìm thấy userId or tripId'})
//     }
//     console.log('callback UserId: ', req.query.userId)
//     console.log('callback TripId: ', req.query.tripId)
//     try {
//       let dataStr = req.body.data;
//       let reqMac = req.body.mac;

//       let mac = CryptoJS.HmacSHA256(dataStr, zaloPayConfig.key2).toString();
//       console.log("mac =", mac);

//       // kiểm tra callback hợp lệ (đến từ ZaloPay server)
//       if (reqMac !== mac) {
//         // callback không hợp lệ
//         result.return_code = -1;
//         result.return_message = "mac not equal";
//       }
//       else {
//         // thanh toán thành công
//         // merchant cập nhật trạng thái cho đơn hàng
//         let dataJson = JSON.parse(dataStr, zaloPayConfig.key2);
//         console.log("update order's status = success where app_trans_id =", dataJson["app_trans_id"]);

//         result.return_code = 1;
//         result.return_message = "success";
//         const trip = await Trip.findById(tripId)
//         // Tạo mới bus
//         const newTicket = new Ticket({
//           route: trip.route,
//           bus: trip.bus,
//           seat: seatId,
//           user: userId,
//           price: trip.price,
//           departureTime: trip.departureTime
//       });
//         // Tìm ghế với seatId trong mảng seats của chuyến đi
// const seatToUpdate = trip.seats.find(seat => seat.seat.toString() === seatId);

// if (!seatToUpdate) {
//   // Xử lý trường hợp không tìm thấy ghế
//   return { success: false, message: 'Không tìm thấy ghế trong chuyến đi' };
// }

// // Cập nhật trạng thái của ghế
// seatToUpdate.status = true;

//       await newTicket.save()
//       await trip.save();
//       }
//     } catch (ex) {
//       result.return_code = 0; // ZaloPay server sẽ callback lại (tối đa 3 lần)
//       result.return_message = ex.message;
//       console.log(ex)
//     }

//     // thông báo kết quả cho ZaloPay server
//     res.json(result);
//     console.log(result)
//   });
router.post('/', async (req, res) => {
  let result = {};

  try {
    let dataStr = req.body.data;
    let reqMac = req.body.mac;

    let mac = CryptoJS.HmacSHA256(dataStr, zaloPayConfig.key2).toString();

    if (reqMac !== mac) {
      result.return_code = -1;
      result.return_message = 'mac not equal';
    } else {
      let dataJson = JSON.parse(dataStr, zaloPayConfig.key2);
      result.return_code = 1;
      result.return_message = 'success';

      // Trích xuất thông tin từ embed_data
      const embedData = JSON.parse(dataJson.embed_data);

      const { userId, tripId, seatIds, isReverse } = embedData;
      if (!userId || !tripId || !seatIds) {
        throw new Error('Thiếu thông tin từ embed_data');
      }

      const trip = await Trip.findById(tripId);

      // Lặp qua từng seatId và tạo vé cho từng ghế
      for (const seatId of seatIds) {
        const seatToUpdate = trip.seats.find(
          (seat) => seat.seat.toString() === seatId,
        );
        if (seatToUpdate) {
          seatToUpdate.status = true; // Đánh dấu ghế đã được đặt
        }
        const currentTime = new Date()
        const newTicket = new Ticket({
          route: trip.route,
          bus: trip.bus,
          trip: tripId,
          isReverse: trip.isReverse,
          seat: seatId,
          user: userId,
          price: trip.price,
          departureTime: trip.departureTime,
          purchaseDay: currentTime
        });
        await User.findByIdAndUpdate(
          userId,
          { $push: { tickets: newTicket._id } },
          { new: true, useFindAndModify: true } 
        );
        await newTicket.save();
      }

      await trip.save();
    }
  } catch (ex) {
    result.return_code = 0;
    result.return_message = ex.message;
  }

  res.json(result);
});

module.exports = router;

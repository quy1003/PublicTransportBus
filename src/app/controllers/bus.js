const Bus = require('../models/Bus');
const Seat = require('../models/Seat');
const Route = require('../models/Route')
class BusController {

  //[GET] - /buses/
  async listBus(req, res) {
    try {
      const { page = 1, q } = req.query;
      const pageSize = parseInt(process.env.PAGE_SIZE);

      const searchQuery = q ? { name: new RegExp(q, 'i') } : {};

      const buses = await Bus.find(searchQuery)
        .select('-seats -route')
        .populate('route', 'name')
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      const totalBuses = await Bus.countDocuments(searchQuery);
      const totalPages = Math.ceil(totalBuses / pageSize);
      const currentPage = parseInt(page);

      const prevPage = currentPage > 1 ? currentPage - 1 : null;
      const nextPage = currentPage < totalPages ? currentPage + 1 : null;

      return res.status(200).json({
        totalBuses,
        totalPages,
        currentPage,
        prevPage,
        nextPage,
        buses,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get buses' });
    }
  }
  //[POST] - /buses/create-bus/
  async createBus(req, res) {
    const { name, routeId, capacity } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Vui lòng nhập tên bus' });
    }
    if (!capacity) {
      return res.status(400).json({ message: 'Vui lòng nhập sức chứa của bus' });
    }

    if (!Number.isInteger(capacity) || capacity <= 0) {
      return res
        .status(400)
        .json({ message: 'Vui lòng nhập số nguyên hợp lệ cho capacity' });
    }

    try {
      const newBus = new Bus({
        name: name,
        route: routeId ? routeId : null,
        capacity: capacity,
      });

      await newBus.save();

      let seats = [];
      for (let i = 1; i <= capacity; i++) {
        const seatName = `Ghế ${i}`;
        const seat = new Seat({ name: seatName, bus: newBus._id });
        seats.push(seat);
      }

      const savedSeats = await Seat.insertMany(seats);

      newBus.seats.push(...savedSeats.map((seat) => seat._id));

      if(routeId){
        await Route.findByIdAndUpdate(
          routeId,
          { $push: { buses: newBus._id } }, 
          { new: true }
        );
      }
      await newBus.save();

      return res.status(201).json({ message: 'Thêm xe bus và ghế thành công' });
    } catch (ex) {
      console.log(ex);
      return res.status(500).json({ error: 'Failed to create Bus and Seats' });
    }
}
// async createBus(req, res) {
  //   const { name, routeId, capacity } = req.body;

  //   // Kiểm tra nếu không có tên bus
  //   if (!name) {
  //     return res.status(400).json({ message: 'Vui lòng nhập tên bus' });
  //   }

  //   // Kiểm tra capacity có phải là số nguyên không
  //   if (!Number.isInteger(capacity) || capacity <= 0) {
  //     return res
  //       .status(400)
  //       .json({ message: 'Vui lòng nhập số nguyên hợp lệ cho capacity' });
  //   }

  //   try {
  //     // Tạo mới bus
  //     const newBus = new Bus({
  //       name: name,
  //       route: routeId || null, // Sử dụng routeId nếu có, nếu không sẽ là null
  //       capacity: capacity,
  //     });

  //     // Lưu bus mới vào cơ sở dữ liệu
  //     await newBus.save();

  //     // Tạo ghế tự động dựa trên capacity
  //     let seats = [];
  //     for (let i = 1; i <= capacity; i++) {
  //       const seatName = `${newBus.name} - Ghế ${i}`;
  //       const seat = new Seat({ name: seatName, bus: newBus._id });
  //       seats.push(seat);
  //     }

  //     // Lưu tất cả các ghế vào cơ sở dữ liệu
  //     const savedSeats = await Seat.insertMany(seats);

  //     // Lấy danh sách ObjectId của các ghế đã lưu và thêm vào bus
  //     newBus.seats.push(...savedSeats.map((seat) => seat._id));

  //     // Lưu lại bus với các ghế đã thêm
  //     await newBus.save();

  //     return res.status(201).json({ message: 'Thêm xe bus và ghế thành công' });
  //   } catch (ex) {
  //     console.log(ex);
  //     return res.status(500).json({ error: 'Failed to create Bus and Seats' });
  //   }
  // }
  //[POST] - /buses/add-seats/:id
  async addSeat(req, res) {
    try {
      const busId = req.params.id;
      const { capacity } = req.body;

      // Kiểm tra busId
      if (!busId) {
        return res
          .status(400)
          .json({ message: 'Vui lòng cung cấp ID của bus' });
      }

      // Kiểm tra capacity có phải là số nguyên không
      if (!Number.isInteger(capacity) || capacity <= 0) {
        return res
          .status(400)
          .json({ message: 'Vui lòng nhập số nguyên hợp lệ cho capacity' });
      }

      const bus = await Bus.findById(busId);
      if (!bus) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin xe' });
      }

      let seats = [];
      for (let i = 1; i <= capacity; i++) {
        const seatName = `${bus.name} - Ghế ${i}`;
        const seat = new Seat({ name: seatName, bus: busId });
        seats.push(seat);
      }

      // Lưu tất cả các ghế vào cơ sở dữ liệu
      const savedSeats = await Seat.insertMany(seats);

      // Lấy danh sách ObjectId của các ghế đã lưu
      const seatIds = savedSeats.map((seat) => seat._id);

      // Thêm các ObjectId này vào bus và lưu bus lại
      bus.seats.push(...seatIds);
      await bus.save();

      return res
        .status(200)
        .json({
          message: `Đã thêm ${capacity} ghế vào bus`,
          seats: savedSeats,
        });
    } catch (ex) {
      console.error(ex);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
  //[GET] = /buses/list-seats/:id
  async listSeat(req, res) {
    try {
      const busId = req.params.id;
      const bus = await Bus.findById(busId).populate('seats', 'name');
      if (!bus) {
        return res.status(404).json({ message: 'Không tìm thấy thông tin xe' });
      }
      return res.status(200).json(bus.seats);
    } catch (ex) {
      console.error(ex);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}

module.exports = new BusController();

const Seat = require('../models/Seat');

class SeatController {
  //[POST] - /buses/create-bus/
  async createSeat(req, res) {
    const { name, busId } = req.body;

    if (!name) {
      return res.status(404).json({ message: 'Vui lòng nhập tên ghế' });
    }

    try {
      const newBus = new Seat({
        name: name,
        bus: busId || null, // Sử dụng routeId nếu có, nếu không sẽ là chuỗi rỗng
      });

      await newBus.save();

      return res
        .status(201)
        .json({ message: 'Thêm thông tin ghế thành công', bus: newBus });
    } catch (ex) {
      console.log(ex);
      return res.status(500).json({ error: 'Failed to create Seat' });
    }
  }
}

module.exports = new SeatController();

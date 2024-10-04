const Ticket = require('../models/Ticket');
class TicketController {
  //[GET] - /tickets/
  async listTicket(req, res) {
    try {
      const { page = 1, pageSize = 10 } = req.query;
      const parsedPage = parseInt(page);
      const parsedPageSize = parseInt(pageSize);

      const tickets = await Ticket.find()
        .populate('route', 'name')
        .populate('bus', 'name')
        .populate('seat', 'name')
        .populate('user', 'name')
        .skip((parsedPage - 1) * parsedPageSize)
        .limit(parsedPageSize);

      if (!tickets || tickets.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy vé' });
      }

      const formattedTickets = tickets.map((ticket) => ({
        _id: ticket._id,
        route: ticket.route.name,
        bus: ticket.bus.name,
        seat: ticket.seat.name,
        user: ticket.user.name,
        isReverse: ticket.isReverse,
        price: ticket.price,
        departureTime: ticket.departureTime,
        purchaseDay: ticket.purchaseDay
      }));

      const totalTickets = await Ticket.countDocuments();
      const totalPages = Math.ceil(totalTickets / parsedPageSize);
      const currentPage = parsedPage;

      const prevPage = currentPage > 1 ? currentPage - 1 : null;
      const nextPage = currentPage < totalPages ? currentPage + 1 : null;

      return res.status(200).json({
        totalTickets,
        totalPages,
        currentPage,
        prevPage,
        nextPage,
        tickets: formattedTickets,
      });
    } catch (ex) {
      console.error(ex);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
  async getRevenueYears(req, res) {
    try {
      const years = await Ticket.aggregate([
        {
          $group: {
            _id: { $year: "$purchaseDay" },
          },
        },
        { $sort: { "_id": 1 } },
      ]);

      const formattedYears = years.map(item => item._id);

      return res.status(200).json({ years: formattedYears });
    } catch (ex) {
      console.error(ex);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
  async getRevenueByMonth(req, res) {
    try {
      const { year } = req.query;

      // Lấy doanh thu theo tháng cho một năm nhất định (hoặc toàn bộ nếu không có tham số năm)
      const matchCondition = year ? { purchaseDay: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } } : {};

      const revenueByMonth = await Ticket.aggregate([
        { $match: matchCondition }, // Lọc các vé theo năm nếu có
        {
          $group: {
            _id: { $month: "$purchaseDay" }, // Nhóm theo tháng dựa trên ngày mua vé
            totalRevenue: { $sum: "$price" }, // Tính tổng doanh thu theo tháng
          },
        },
        { $sort: { "_id": 1 } }, // Sắp xếp theo tháng (từ tháng 1 đến tháng 12)
      ]);

      // Format dữ liệu trước khi trả về (tháng từ 1 đến 12)
      const formattedRevenue = revenueByMonth.map(item => ({
        month: item._id,  // Tháng
        totalRevenue: item.totalRevenue  // Tổng doanh thu cho tháng đó
      }));

      return res.status(200).json(formattedRevenue);
    } catch (ex) {
      console.error(ex);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}

module.exports = new TicketController();

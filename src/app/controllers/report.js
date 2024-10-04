const Report = require('../models/Report')
const Bus = require('../models/Bus')
class ReportController {
    //[GET] - /reports/
  async listReport(req, res) {
    try {
      const { page = 1, q } = req.query;
      const pageSize = parseInt(process.env.PAGE_SIZE);

      const searchQuery = q ? { name: new RegExp(q, 'i') } : {};

      const reports = await Report.find(searchQuery)
        .populate('bus', 'name')
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      const totalReports = await Report.countDocuments(searchQuery);
      const totalPages = Math.ceil(totalReports / pageSize);
      const currentPage = parseInt(page);

      const prevPage = currentPage > 1 ? currentPage - 1 : null;
      const nextPage = currentPage < totalPages ? currentPage + 1 : null;

      return res.status(200).json({
        totalReports,
        totalPages,
        currentPage,
        prevPage,
        nextPage,
        reports,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get buses' });
    }
  }

    //[POST] - /reports/create-report/
    async createReport(req, res){
        const {busId, note} = req.body
        try{
            if(!busId){
                return res.status(404).json({message:'Vui lòng gửi thông tin xe'})
            }
            const bus = await Bus.findById(busId)
            bus.status = false
            await bus.save()

            const newReport = new Report({
                bus: busId,
                note: note || '',
                status: false
            })
            await newReport.save()

            return res.status(201).json({message:'Tạo báo cáo mới thành công'})
        }
        catch(ex){
            return res.status(500).json({message:'Lỗi hệ thống'})
        }
    }
    //[PATCH] - /reports/:id/update-report/
    async updateReport(req,res){
        try{
            const {id} = req.params
            const report = await Report.findById(id)

            if(!report){
                return res.status(404).json({message:'Không tìm thấy thông tin báo cáo'})
            }
            report.status = true
            await report.save()

            const bus = await Bus.findById(report.bus).select('_id')

            if(!bus){
                return res.status(404).json({message:'Không tìm thấy xe buýt'})
            }
            const lastestBusReport = await Report.findOne({bus: report.bus}).sort({createdAt: -1 })
            if (lastestBusReport && lastestBusReport._id.toString() === id.toString()) {
                bus.status = true
                await bus.save()
            }
            return res.status(200).json({message:'Cập nhật thành công'})
        }
        catch(ex){
            return res.status(500).json({message:'Lỗi hệ thống'})
        }
    }
}

module.exports = new ReportController();

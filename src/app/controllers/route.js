const Route = require('../models/Route');
const Station = require('../models/Station');
const Bus = require('../models/Bus');
class RouteController {
  //[GET] - /routes/
  async listRoute(req, res) {
    try {
      const { page = 1, q } = req.query;
      const pageSize = parseInt(process.env.PAGE_SIZE);

      // Tạo điều kiện tìm kiếm
      const searchQuery = q ? { name: new RegExp(q, 'i') } : {};

      // Tìm các tuyến xe theo từ khóa và phân trang
      const routes = await Route.find(searchQuery)
        .select('-stations -stationsReverse')
        .populate('buses', 'name')
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      // Đếm tổng số tuyến xe phù hợp với từ khóa
      const totalRoutes = await Route.countDocuments(searchQuery);
      const totalPages = Math.ceil(totalRoutes / pageSize);
      const currentPage = parseInt(page);

      const prevPage = currentPage > 1 ? currentPage - 1 : null;
      const nextPage = currentPage < totalPages ? currentPage + 1 : null;

      return res.status(200).json({
        totalRoutes,
        totalPages,
        currentPage,
        prevPage,
        nextPage,
        routes,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get routes' });
    }
  }

  //[GET] - /routes/:id
  async detailRoute(req, res) {
    try {
      const routeId = req.params.id;
      
      const route = await Route.findById(routeId)
      .populate('stations', 'name coordinates')
      .populate('stationsReverse', 'name coordinates')
      .populate('buses', 'name')
      
      const buses = await Bus.find({ route: routeId }).select('name')
      const routes = {
        ...route._doc,
        buses
      }
      return res.status(200).json(routes);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get routes' });
    }
  }
  //[POST] - /routes/create-route/
  async createRoute(req, res) {
    const name = req.body.name;
    if (!name) {
      return res.status(404).json({ message: 'Nhập tên tuyến xe!' });
    }
    try {
      const newRoute = new Route({
        name: name,
      });
      await newRoute.save();
      return res
        .status(201)
        .json({ message: 'Thêm tuyến xe thành công', route: newRoute });
    } catch (ex) {
      return res.status(500).json({ message: 'Lỗi server' });
    }
  }


  //[POST] - /routes/add-station/:id
  async addStation(req, res) {
    try {
      const routeId = req.params.id;
      const { stationIds, reverse, position } = req.body;
  
      if (!stationIds || !Array.isArray(stationIds) || stationIds.length === 0) {
        return res.status(400).json({ message: 'Vui lòng cung cấp danh sách ID của các trạm' });
      }
  
      const route = await Route.findById(routeId);
      if (!route) {
        return res.status(404).json({ message: 'Không tìm thấy tuyến đường' });
      }
  
      const validStations = await Station.find({ _id: { $in: stationIds } });
  
      if (validStations.length !== stationIds.length) {
        return res.status(404).json({ message: 'Một hoặc nhiều trạm không tồn tại' });
      }

      const stationsArray = reverse ? route.stationsReverse : route.stations;

      if (position !== undefined) {
        stationsArray.splice(position, 0, ...stationIds);
      } else {
        stationsArray.push(...stationIds);
      }
  
      await route.save();
  
      for (const stationId of stationIds) {
        await Station.findByIdAndUpdate(stationId, {
          $addToSet: { routes: routeId },
        });
      }
  
      return res.status(200).json({ message: 'Trạm đã được thêm vào tuyến', route });
    } catch (ex) {
      console.error('Error:', ex);
      res.status(500).json({ message: 'Lỗi hệ thống' });
    }
  }


  //[POST] - /routes/add-bus/:id
  async addBuses(req, res) {
    try {
      const routeId = req.params.id;
      const { buses } = req.body; 
  
      if (!Array.isArray(buses) || buses.length === 0) {
        return res.status(400).json({ message: 'Danh sách bus không hợp lệ' });
      }
  
      const route = await Route.findById(routeId);
      if (!route) {
        return res.status(404).json({ message: 'Không tìm thấy tuyến đường' });
      }
  
      const addedBuses = [];
      for (const busId of buses) {
        const bus = await Bus.findById(busId);
        if (!bus) {
          return res.status(404).json({ message: `Không tìm thấy xe bus với ID: ${busId}` });
        }
        if (route.buses.some(b => b._id.equals(busId))) {
          return res.status(400).json({ message: `Bus ${busId} đã tồn tại trong tuyến` });
        }
        
        bus.route = routeId;
        await bus.save();
  
        route.buses.push(bus);
        addedBuses.push(bus);
      }
  
      await route.save();
  
      return res.status(200).json({ message: 'Các bus đã được thêm vào tuyến', buses: addedBuses });
    } catch (ex) {
      console.error(ex);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
  
}

module.exports = new RouteController();

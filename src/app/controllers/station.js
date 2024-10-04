const Station = require('../models/Station');
const Route = require('../models/Route');
const mongoose = require('mongoose');
const NodeGeocoder = require('node-geocoder');

const options = {
  provider: 'openstreetmap',
  httpAdapter: 'https',
  formatter: null,
  headers: {
    'User-Agent': 'PUBLICTRANSPORT/1.0 (2151053052quy@ou.edu.vn)',
  },
};

const geocoder = NodeGeocoder(options);

class StationController {
  constructor() {
    this.findAllPaths = this.findAllPaths.bind(this);
    // this.getGeocode = this.getGeocode.bind(this);
    this.createStation = this.createStation.bind(this);
    this.geocodeCache = new Map();
    this.myJourney = this.myJourney.bind(this); // Bind this.myJourney
  }

  // async getGeocode(location) {
  //   if (this.geocodeCache.has(location)) {
  //     return this.geocodeCache.get(location);
  //   }
  //   const geocodeResult = await geocoder.geocode(location);
  //   this.geocodeCache.set(location, geocodeResult);
  //   return geocodeResult;
  // }
  async isLocationValid(location) {
    try {
      const geocodeResult = await geocoder.geocode(location);
      return geocodeResult && geocodeResult.length > 0;
    } catch (error) {
      console.error('Error checking location:', error);
      return false;
    }
  }

  //[GET] - /stations/
  async listStation(req, res) {
    try {
      const { page = 1, q } = req.query;
      const pageSize = parseInt(process.env.PAGE_LARGER_SIZE);

      const searchQuery = q ? { name: new RegExp(q, 'i') } : {};

      const stations = await Station.find(searchQuery)
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      const totalStations = await Station.countDocuments(searchQuery);
      const totalPages = Math.ceil(totalStations / pageSize);
      const currentPage = parseInt(page);

      const prevPage = currentPage > 1 ? currentPage - 1 : null;
      const nextPage = currentPage < totalPages ? currentPage + 1 : null;

      return res.status(200).json({
        totalStations,
        totalPages,
        currentPage,
        prevPage,
        nextPage,
        stations,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to get stations' });
    }
  }

  //[POST] - /stations/create-station/
  async createStation(req, res) {
    const { name, routeIds = null, location, latitude, longitude } = req.body;

  if (!name || !location || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ message: 'Thiếu thông tin cần thiết' });
  }


  const coordinates = [longitude, latitude];

  try {

    const newStation = new Station({
      name: name,
      route: routeIds, 
      location: location,
      coordinates: coordinates,
    });


    await newStation.save();

    return res.status(201).json({ message: 'Tạo mới station thành công', station: newStation });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Không thể tạo station mới', error });
  }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }
  filterValidPaths(paths) {
    const validPaths = [];

    paths.forEach(path => {
        const grouped = [];
        let currentGroup = [];
        let lastRoute = null;

        // Nhóm các trạm theo tuyến đường
        for (let i = 1; i < path.length; i++) {
            const currentRoute = path[i].routeName;
            if (currentRoute !== lastRoute) {
                if (currentGroup.length > 0) {
                    grouped.push(currentGroup);
                }
                currentGroup = [path[i - 1]];
                lastRoute = currentRoute;
            } else {
                currentGroup.push(path[i - 1]);
            }
        }

        // Thêm nhóm cuối cùng
        if (currentGroup.length > 0) {
            currentGroup.push(path[path.length - 1]);
            grouped.push(currentGroup);
        }

        // Lọc các đường đi có sự xen kẽ không hợp lý
        let isValid = true;
        for (let i = 1; i < grouped.length; i++) {
            const prevGroup = grouped[i - 1];
            const currGroup = grouped[i];
            if (prevGroup[prevGroup.length - 1].routeName !== currGroup[0].routeName) {
                isValid = false;
                break;
            }
        }

        if (isValid) {
            validPaths.push(path);
        }
    });

    return validPaths;
}
  //[POST] - /stations/find-station/
  async findAllPaths(req, res) {
    const { startStationId, endStationId } = req.body;
  
    if (!startStationId || !endStationId) {
      return res
        .status(400)
        .json({ error: 'Vui lòng nhập đủ ID của trạm khởi hành và trạm đích' });
    }
  
    try {
      // Lấy thông tin trạm, tuyến và đồ thị một lần
      const [startStation, endStation, graph] = await Promise.all([
        Station.findById(startStationId).populate('routes'),
        Station.findById(endStationId).populate('routes'),
        this.buildGraphWithRoutes(),
      ]);
  
      if (!startStation || !endStation) {
        return res.status(404).json({
          error: 'Không tìm thấy trạm bắt đầu hoặc kết thúc trong hệ thống',
        });
      }
  
      // Tìm tất cả các đường đi từ startStation đến endStation
      const allPaths = [];
      const dfs = (path, visited) => {
        const currentStationId = path[path.length - 1].stationId;
        if (currentStationId === endStationId) {
          allPaths.push(path);
          return;
        }
  
        const nextStations = graph.get(currentStationId) || [];
        for (const { stationId: nextStationId, routeId } of nextStations) {
          if (!visited.has(nextStationId)) {
            visited.add(nextStationId);
            dfs([...path, { stationId: nextStationId, routeId }], visited);
            visited.delete(nextStationId);
          }
        }
      };
  
      // Khởi tạo DFS với tất cả các tuyến của trạm bắt đầu
      for (const route of startStation.routes) {
        dfs(
          [{ stationId: startStationId, routeId: route._id }],
          new Set([startStationId])
        );
      }
  
      // Lấy thông tin trạm và tuyến
      const stationIds = Array.from(
        new Set(allPaths.flat().map((entry) => entry.stationId))
      );
      const stations = await Station.find({ _id: { $in: stationIds } }).select(
        '_id name routes coordinates'
      );
  
      const routeIds = Array.from(
        new Set(
          allPaths
            .flat()
            .map((entry) => entry.routeId)
            .filter((id) => id)
        )
      );
      const routes = await Route.find({ _id: { $in: routeIds } }).select(
        '_id name'
      );
  
      const stationMap = stations.reduce((map, station) => {
        map[station._id] = station;
        return map;
      }, {});
  
      const routeMap = routes.reduce((map, route) => {
        map[route._id] = route;
        return map;
      }, {});
  
      // Tính toán và tạo thông tin chi tiết của các đường đi
      const pathsWithDetails = allPaths.map((path) => {
        let totalDistance = 0;
  
        const detailedPath = path.map((entry, index) => {
          const station = stationMap[entry.stationId];
          const route = entry.routeId ? routeMap[entry.routeId] : null;
  
          if (index > 0) {
            const prevStation = stationMap[path[index - 1].stationId];
            const distance = this.calculateDistance(
              prevStation.coordinates[1], // latitude
              prevStation.coordinates[0], // longitude
              station.coordinates[1], // latitude
              station.coordinates[0], // longitude
            );
            totalDistance += distance;
          }
  
          return {
            _id: station._id,
            name: station.name,
            coordinate: station.coordinates,
            routeName: route ? route.name : 'Không có tuyến đường',
          };
        });
  
        return [{ total_distance: totalDistance.toFixed(2) }, ...detailedPath];
      });
  
      const validPaths = this.filterValidPaths(pathsWithDetails);
      return res.status(200).json(validPaths);
    } catch (error) {
      console.error('Lỗi:', error.message);
      return res.status(500).json({ error: 'Lỗi hệ thống' });
    }
  }
  
  
  

  async buildGraphWithRoutes() {
    if (this.cachedGraphWithRoutes) {
      return this.cachedGraphWithRoutes;
    }

    const graph = new Map();
    const routes = await Route.find().populate('stations').populate('stationsReverse');

    for (const route of routes) {
      const stations = route.stations.map(station => station._id.toString());
      const stationsReverse = route.stationsReverse.map(station => station._id.toString());

      for (let i = 0; i < stations.length - 1; i++) {
        if (!graph.has(stations[i])) {
          graph.set(stations[i], []);
        }
        graph.get(stations[i]).push({ stationId: stations[i + 1], routeId: route._id.toString() });
      }

      for (let i = 0; i < stationsReverse.length - 1; i++) {
        if (!graph.has(stationsReverse[i])) {
          graph.set(stationsReverse[i], []);
        }
        graph.get(stationsReverse[i]).push({ stationId: stationsReverse[i + 1], routeId: route._id.toString() });
      }
    }

    this.cachedGraphWithRoutes = graph;
    return graph;
  }

    

  // [POST] - /stations/my-journey/
  async myJourney(req, res) {
    const { currentAddress, endStationId } = req.body;

    if (!currentAddress || !endStationId) {
      return res.status(400).json({
        error: 'Vui lòng cung cấp địa chỉ hiện tại và ID của trạm đích.',
      });
    }

    try {
      // Kiểm tra xem địa chỉ hiện tại có hợp lệ không
      const isValidLocation = await this.isLocationValid(currentAddress);
      if (!isValidLocation) {
        return res
          .status(404)
          .json({ error: 'Không tìm thấy địa chỉ hiện tại.' });
      }

      // Phân giải địa chỉ thành tọa độ kinh độ và vĩ độ
      const geocodeResult = await this.getGeocode(currentAddress);
      if (!geocodeResult || geocodeResult.length === 0) {
        return res
          .status(404)
          .json({ error: 'Không tìm thấy tọa độ cho địa chỉ hiện tại.' });
      }

      const { latitude, longitude } = geocodeResult[0];

      // Tìm trạm gần nhất (không giới hạn bán kính)
      const nearestStation = await Station.findOne({
        coordinates: {
          $near: {
            $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          },
        },
      }).select('_id name route coordinates');

      if (!nearestStation) {
        return res.status(404).json({ error: 'Không có trạm nào gần bạn.' });
      }

      const endStation = await Station.findById(endStationId);
      if (!endStation) {
        return res.status(404).json({ message: 'Trạm đích không tồn tại' });
      }

      // Gọi hàm findAllPaths để tìm tất cả các quãng đường từ nearestStation đến endStation
      const paths = await this.findAllPaths(
        {
          body: {
            startStationId: nearestStation._id.toString(),
            endStationId: endStation._id.toString(),
          },
        },
        {
          status: (statusCode) => ({
            json: (data) => ({ statusCode, data }), // Giả lập phương thức JSON
          }),
        },
      );

      if (paths.statusCode !== 200) {
        return res
          .status(paths.statusCode)
          .json({ error: 'Không tìm thấy đường đi.' });
      }

      return res.status(200).json(paths.data);
    } catch (error) {
      console.error('Lỗi:', error.message);
      return res
        .status(500)
        .json({ error: 'Lỗi hệ thống', details: error.message });
    }
  }
}

module.exports = new StationController();

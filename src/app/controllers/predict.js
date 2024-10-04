const ticketModel = require("../models/Ticket");
const userModel = require("../models/User"); // Import model người dùng
const tf = require("@tensorflow/tfjs"); // Import TensorFlow.js
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai")
const genAI = new GoogleGenerativeAI("AIzaSyBP7eLp7yxHs1e_P6fT72pOUsuPhA-j6Rw")
const trainingResult = require('../config/training')
class PredictController {
  constructor() {
    this.fetchRevenueData = this.fetchRevenueData.bind(this);
    this.prepareData = this.prepareData.bind(this);
    this.linearRegression = this.linearRegression.bind(this);
    this.predictNextMonthRevenue = this.predictNextMonthRevenue.bind(this);
    this.clusterUsersAndAnalyzeBehavior =
      this.clusterUsersAndAnalyzeBehavior.bind(this);
  }

  async fetchRevenueData() {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    const tickets = await ticketModel
      .find({ purchaseDay: { $gte: startDate } })
      .exec();
    const monthlyRevenue = {};

    tickets.forEach((ticket) => {
      const month = ticket.purchaseDay.getMonth() + 1;
      const year = ticket.purchaseDay.getFullYear();
      const key = `${year}-${month}`;

      if (!monthlyRevenue[key]) {
        monthlyRevenue[key] = 0;
      }
      monthlyRevenue[key] += ticket.price;
    });

    return monthlyRevenue;
  }

  prepareData(monthlyRevenue) {
    const months = Object.keys(monthlyRevenue);
    const revenues = Object.values(monthlyRevenue);

    const X = months.map((month, index) => index + 1);
    const y = revenues;
    return { X, y };
  }

  linearRegression(X, y) {
    const n = X.length;

    if (n === 0 || n !== y.length) {
      throw new Error("Dữ liệu không hợp lệ cho hồi quy tuyến tính.");
    }

    const sumX = X.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = X.reduce((sum, x, idx) => sum + x * y[idx], 0);
    const sumX2 = X.reduce((sum, x) => sum + x * x, 0);

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) {
      throw new Error("Không thể tính toán slope do phép chia cho 0.");
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  async predictNextMonthRevenue(req, res) {
    try {
      const revenueData = await this.fetchRevenueData();
      const { X, y } = this.prepareData(revenueData);

      if (X.length === 0 || y.length === 0) {
        return res
          .status(400)
          .json({ message: "Không có đủ dữ liệu để dự đoán." });
      }

      console.log("Dữ liệu X:", X);
      console.log("Dữ liệu y:", y);

      const { slope, intercept } = this.linearRegression(X, y);
      const nextMonthIndex = X[X.length - 1] + 1;
      const predictedRevenue = slope * nextMonthIndex + intercept;

      if (isNaN(predictedRevenue)) {
        throw new Error("Dự đoán doanh thu là NaN.");
      }

      res.json({
        message: "Dự đoán doanh thu thành công",
        predictedRevenue: predictedRevenue.toFixed(2),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  }

  async clusterUsersAndAnalyzeBehavior(req, res) {
    try {
        const users = await userModel.find({}).populate("tickets");
        const ticketData = users.flatMap((user) =>
            user.tickets.map((ticket) => ({
                userId: user._id,
                purchaseDay: ticket.purchaseDay,
                price: ticket.price,
            }))
        );

        if (ticketData.length === 0) {
            return res
                .status(400)
                .json({ message: "Không có dữ liệu hợp lệ sau khi làm sạch." });
        }

        //Kiểm tra và loại bỏ dữ liệu không hợp lệ
        const validTicketData = ticketData.filter(data => data.price >= 0);
        if (validTicketData.length === 0) {
            return res.status(400).json({ message: "Không có dữ liệu hợp lệ." });
        }

        const groupedData = {
            "Đầu tuần": [],
            "Giữa tuần": [],
            "Cuối tuần": [],
        };

        validTicketData.forEach((data) => {
            const dayOfWeek = data.purchaseDay.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 3) {
                groupedData["Đầu tuần"].push(data);
            } else if (dayOfWeek >= 4 && dayOfWeek <= 5) {
                groupedData["Giữa tuần"].push(data);
            } else {
                groupedData["Cuối tuần"].push(data);
            }
        });

        const summary = {};
        const totalUsers = validTicketData.length;

        for (const [key, group] of Object.entries(groupedData)) {
            const count = group.length;
            const totalSpending = group.reduce((acc, curr) => acc + curr.price, 0);
            const percentage =
                totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(2) : 0;

            summary[key] = { count, totalSpending, percentage: `${percentage}%` };
        }

        //Dự đoán giá vé cho từng ngày trong tuần (0-6)
        const dailySalesCount = Array(7).fill(0); // Số vé bán ra cho từng ngày
        const dailyPrices = Array(7).fill(0); // Tổng giá vé bán ra cho từng ngày
        const predictionsResult = {
            "Chủ nhật": 0,
            "Thứ hai": 0,
            "Thứ ba": 0,
            "Thứ tư": 0,
            "Thứ năm": 0,
            "Thứ sáu": 0,
            "Thứ bảy": 0,
        };

        // Tính toán số lượng vé và tổng giá vé cho từng ngày
        validTicketData.forEach(data => {
            const day = data.purchaseDay.getDay();
            dailySalesCount[day]++;
            dailyPrices[day] += data.price;
        });

        // Tính giá vé trung bình cho mỗi ngày
        const dailyAveragePrices = dailyPrices.map((totalPrice, day) => 
            dailySalesCount[day] > 0 ? totalPrice / dailySalesCount[day] : 0
        );

        // Tính giá trung bình cho các ngày có vé bán ra
        const totalAveragePrice = dailyAveragePrices.reduce((sum, price) => sum + price, 0) / 
            dailySalesCount.filter(count => count > 0).length;

        // Điều chỉnh giá dựa trên số lượng vé bán ra
        dailySalesCount.forEach((count, day) => {
            let adjustment = 0;
            if (count < 3) {
                adjustment = -0.1; // Giảm giá
            } else if (count > 10) {
                adjustment = 0.1; // Tăng giá
            }
            //Nếu không có vé bán ra, lấy giá trung bình của các ngày khác
            if (count === 0) {
                predictionsResult[["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"][day]] = totalAveragePrice.toFixed(2);
            } else {
                predictionsResult[["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"][day]] = (dailyAveragePrices[day] * (1 + adjustment)).toFixed(2);
            }
        });

        //Phân tích dự đoán
        const averagePrediction =
            Object.values(predictionsResult).reduce((sum, val) => sum + parseFloat(val), 0) / 7;
        const maxPrediction = Math.max(...Object.values(predictionsResult).map(val => parseFloat(val)));
        const minPrediction = Math.min(...Object.values(predictionsResult).map(val => parseFloat(val)));

        //Kết luận
        const conclusion = {
            average: averagePrediction.toFixed(2),
            maximum: maxPrediction.toFixed(2),
            minimum: minPrediction.toFixed(2),
        };

        return res.json({
            message: "Phân cụm hành vi người dùng thành công.",
            summary,
            recommendations: conclusion,
            predictions: predictionsResult,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
}
async  predictAverageUserSpending(req, res) {
  try {
    const users = await userModel.find({}).populate("tickets");

    const allUserSpendingData = users.map(user => {
      const totalUserSpending = user.tickets.reduce((sum, ticket) => sum + ticket.price, 0);
      return totalUserSpending;
    });

    // Kiểm tra dữ liệu
    const validUserSpendingData = allUserSpendingData.filter(total => total > 0); // Bỏ qua người dùng không mua vé nào
    if (validUserSpendingData.length === 0) {
      return res.status(400).json({ message: "Không có dữ liệu chi tiêu hợp lệ." });
    }

    //Chuẩn bị dữ liệu
    const X_tensor = tf.tensor2d(validUserSpendingData, [validUserSpendingData.length, 1]);

    // Tính chi tiêu trung bình hiện tại (để làm input)
    const totalSpending = validUserSpendingData.reduce((sum, spending) => sum + spending, 0);
    const averageUserSpending = totalSpending / validUserSpendingData.length;

    //Tạo mô hình
    const model = tf.sequential();
    
    model.add(tf.layers.dense({ units: 30, inputShape: [1], activation: "relu" })); // Layer đầu tiên với 30 nút và ReLU activation
    model.add(tf.layers.dense({ units: 10, activation: "relu" })); // Layer giữa với 10 nút
    model.add(tf.layers.dense({ units: 1 })); // Layer đầu ra với 1 đơn vị (dự đoán chi tiêu)

    //Compile mô hình
    model.compile({
      optimizer: "adam",
      loss: "meanSquaredError",
    });
    const countTickets = await ticketModel.countDocuments()
    //Huấn luyện mô hình với dữ liệu chi tiêu
    await model.fit(X_tensor, X_tensor, {
      epochs: 130, // Số lần chạy
      batchSize: countTickets, // Kích thước mẫu
      verbose: 1, // Hiển thị tiến trình huấn luyện
    });

    //Sử dụng mô hình để dự đoán chi tiêu trung bình của mỗi người dùng trong tương lai
    const prediction = model.predict(tf.tensor2d([[averageUserSpending]]));
    const predictedAverageSpending = await prediction.array();
    const finalSpending = Math.max(predictedAverageSpending[0][0], 0); // Đảm bảo không có kết quả âm

    res.json({
      message: "Dự đoán chi tiêu trung bình trên mỗi người dùng thành công.",
      predictedAverageUserSpending: finalSpending.toFixed(2), // Làm tròn giá trị dự đoán
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
}
//
async startConversation(req,res) {
  try{
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
    const userMessage = req.body.message;

    // Handle missing user message
    if (!userMessage) {
      return res.status(400).json({ message: "Missing user message in request body" });
    } 
    const inputs = [...trainingResult, `input: ${userMessage}`, 'output: ']
    const result = await model.generateContent(inputs);
    const response = await result.response.candidates;
    return res.status(200).json({message: response})
  }
  catch(ex){
    return res.status(500).json({message:'Interver server error'})
  }
}
//
}

module.exports = new PredictController();

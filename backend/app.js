// app.js
import express from "express";
import AWSXRay from "aws-xray-sdk";
import AWS from "aws-sdk";
import cors from "cors";
import Logger from "./services/logger.js"; // Ensure this file is also an ES module

// Create a new logger instance with your service configuration
const logger = new Logger({ serviceName: "backend/app.js" });

logger.debug("Starting application...");

// Configure X-Ray
AWSXRay.captureAWS(AWS);
const app = express();

// Enable X-Ray Express middleware
app.use(AWSXRay.express.openSegment("TaskTimeTracker"));
app.use(express.json());
app.use(cors());

// Initialize DynamoDB client
const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: "us-east-2",
});

// Health Check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// Create Task endpoint
app.post("/api/tasks", async (req, res) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment("createTask");

  try {
    const { title, description } = req.body;

    if (!title || !description) {
      logger.error("Title and description are required");
      return res.status(400).json({
        error: "Title and description are required",
      });
    }

    const taskId = Date.now().toString();

    const params = {
      TableName: "Tasks",
      Item: {
        taskId,
        title,
        description,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      },
    };

    await dynamoDB.put(params).promise();

    logger.info("Task created successfully", { taskId });
    res.status(201).json({ taskId, message: "Task created successfully" });
  } catch (error) {
    logger.error("Failed to create task", error);
    subsegment.addError(error);
    res.status(500).json({ error: "Failed to create task" });
  } finally {
    subsegment.close();
  }
});

// Get Tasks endpoint
app.get("/api/tasks", async (req, res) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment("getTasks");

  try {
    const params = {
      TableName: "Tasks",
    };

    const result = await dynamoDB.scan(params).promise();

    if (result.Items.length === 0) {
      logger.info("No tasks found");
      return res.status(200).json([]);
    }

    res.json(result.Items);
  } catch (error) {
    logger.error("Failed to fetch tasks", error);
    subsegment.addError(error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  } finally {
    subsegment.close();
  }
});

app.use(AWSXRay.express.closeSegment());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

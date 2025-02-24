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
AWSXRay.middleware.setSamplingRules("sampling-rules.json");
const app = express();

// Enable X-Ray Express middleware
app.use(AWSXRay.express.openSegment("TaskTimeTracker"));
app.use(express.json());
app.use(cors());

const TABLE_NAME = "dev-tasks";

// Initialize DynamoDB client
const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: "us-west-1",
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
      TableName: TABLE_NAME,
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
    res.status(500).json({ error: "Failed to create task" + error });
  } finally {
    subsegment.close();
  }
});

// Get Tasks endpoint
app.get("/api/tasks", async (req, res) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment("getTasks");

  // sort key is createdAt, so we will get the latest tasks first by sorting in descending order
  const params = {
    TableName: TABLE_NAME,
    ScanIndexForward: false,
  };

  try {
    const result = await dynamoDB.scan(params).promise();

    if (result.Items.length === 0) {
      logger.info("No tasks found");
      return res.status(200).json([]);
    }

    const sortSubsegment = segment.addNewSubsegment("sortTasks");
    result.Items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    sortSubsegment.close();

    res.json(result.Items);
  } catch (error) {
    logger.error("Failed to fetch tasks", error);
    subsegment.addError(error);
    res.status(500).json({ error: "Failed to fetch tasks: " + error });
  } finally {
    subsegment.close();
  }
});

// Delete Task endpoint
app.delete("/api/tasks/:taskId", async (req, res) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment("deleteTask");

  try {
    const { taskId } = req.params;

    const params = {
      TableName: TABLE_NAME,
      Key: {
        taskId,
      },
    };

    // check if task exists
    const task = await dynamoDB.get(params).promise();
    if (!task.Item) {
      return res.status(404).json({ error: "Task not found" });
    }

    await dynamoDB.delete(params).promise();

    logger.info("Task deleted successfully", { taskId });
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    logger.error("Failed to delete task", error);
    subsegment.addError(error);
    res.status(500).json({ error: "Failed to delete task: " + error });
  } finally {
    subsegment.close();
  }
});

// Update Task endpoint
app.put("/api/tasks/:taskId", async (req, res) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment("updateTask");

  try {
    const { taskId } = req.params;
    const { title, description, status } = req.body;

    if (!title || !description || !status) {
      logger.error("Title, description, and status are required");
      return res.status(400).json({
        error: "Title, description, and status are required",
      });
    }

    const params = {
      TableName: TABLE_NAME,
      Key: {
        taskId,
      },
      UpdateExpression: "set title = :t, description = :d, #s = :s",
      ExpressionAttributeNames: {
        "#s": "status",
      },
      ExpressionAttributeValues: {
        ":t": title,
        ":d": description,
        ":s": status,
      },
      ReturnValues: "UPDATED_NEW",
    };

    const result = await dynamoDB.update(params).promise();

    logger.info("Task updated successfully", { taskId });
    res.json(result.Attributes);
  } catch (error) {
    logger.error("Failed to update task", error);
    subsegment.addError(error);
    res.status(500).json({ error: "Failed to update task: " + error });
  } finally {
    subsegment.close();
  }
});

app.use(AWSXRay.express.closeSegment());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

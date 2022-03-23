import * as express from "express";
import { Request, Response } from "express";
import * as cors from "cors";
import { createConnection } from "typeorm";
import * as amqp from "amqplib/callback_api";
import { product } from "./entity/product";
import axios from "axios";

createConnection().then((db) => {
  const productRepository = db.getMongoRepository(product);
  amqp.connect("rabbitmq_url", (error0, connection) => {
    if (error0) {
      throw error0;
    }

    connection.createChannel((error1, channel) => {
      if (error1) {
        throw error1;
      }

      // getting events form admin app
      channel.assertQueue("product_created", { durable: false });
      channel.assertQueue("product_updated", { durable: false });
      channel.assertQueue("product_deleted", { durable: false });

      const app = express();

      app.use(
        cors({
          origin: [
            "http://localhost: 3000",
            "http://localhost: 8080",
            "http://localhost: 4200",
          ],
        })
      );

      app.use(express.json());

      // consuming events
      //create product event
      channel.consume(
        "product_created",
        async (msg) => {
          const eventProduct: product = JSON.parse(msg.content.toString());
          const Product = new product();
          Product.admin_id = parseInt(eventProduct.id);
          Product.title = eventProduct.title;
          Product.image = eventProduct.image;
          Product.likes = eventProduct.likes;
          await productRepository.save(Product);
          console.log("product created");
        },
        { noAck: true }
      );

      // product updated
      channel.consume(
        "product_updated",
        async (msg) => {
          const eventProduct: product = JSON.parse(msg.content.toString());
          const Product = await productRepository.findOne({
            admin_id: parseInt(eventProduct.id),
          });
          productRepository.merge(Product, {
            title: eventProduct.title,
            image: eventProduct.image,
            likes: eventProduct.likes,
          });
          await productRepository.save(Product);
          console.log("product updated");
        },
        { noAck: true }
      );

      //product deleted
      channel.consume("product_deleted", async (msg) => {
        const admin_id = parseInt(msg.content.toString());
        await productRepository.deleteOne({ admin_id });
        console.log("product deleted");
      });

      app.get("/api/products", async (req: Request, res: Response) => {
        const products = await productRepository.find();
        return res.send(products);
      });

      //to like the product
      // sending internal server request
      app.post(
        "/api/products/:id/like",
        async (req: Request, res: Response) => {
          const product = await productRepository.findOne(req.params.id);
          await axios.post(
            `http://localhost:8000/api/products/${product.admin_id}/like`,
            {}
          );
          product.likes++;
          await productRepository.save(product);
          return res.send(product);
        }
      );

      const port = 8001;
      app.listen(port, () => {
        console.log("Listening to port 8001");
      });
      process.on("beforeExit", () => {
        console.log("clossing");
        connection.close();
      });
    });
  });
});

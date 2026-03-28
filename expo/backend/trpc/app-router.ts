import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import listingsRouter from "./routes/listings/route";
import bookingsRouter from "./routes/bookings/route";
import authRouter from "./routes/auth/route";
import messagesRouter from "./routes/messages/route";
import reviewsRouter from "./routes/reviews/route";

export const appRouter = createTRPCRouter({
  // Example routes
  example: createTRPCRouter({
    hi: hiRoute,
  }),

  // Core application routes
  listings: listingsRouter,
  bookings: bookingsRouter,
  auth: authRouter,
  messages: messagesRouter,
  reviews: reviewsRouter,
});

export type AppRouter = typeof appRouter;

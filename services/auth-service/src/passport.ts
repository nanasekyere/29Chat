import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import bcrypt from "bcrypt";
import { users } from "./app";
import { Request, Response, NextFunction } from "express";

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = users.find((u) => u.email === email);

        if (!user)
          return done(null, false, { message: "Invalid email or password" });

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid)
          return done(null, false, { message: "Invalid email or password" });

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || "secret",
};

passport.use(
  new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
    try {
      const user = users.find((u) => u.id === jwtPayload.id);
      if (user) {
        return done(null, user);
      }
      return done(null, false);
    } catch (error) {
      return done(error);
    }
  }),
);

export default passport;

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import bcrypt from "bcrypt";
import { getUserByEmail, getUserById } from "@29chat/database";

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await getUserByEmail(email);

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
      const user = await getUserById(jwtPayload.id);
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

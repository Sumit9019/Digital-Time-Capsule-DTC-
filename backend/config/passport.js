const passport = require('passport');
const GitHubStrategy = require('passport-github').Strategy;

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL,
}, (accessToken, refreshToken, profile, done) => {
  const user = {
    githubId: profile.id,
    username: profile.username,
    token: accessToken,
  };
  return done(null, user);
}));

passport.serializeUser((user, done) => {
  done(null, user.githubId); 
});

passport.deserializeUser((id, done) => {
  const user = { githubId: id }; 
  done(null, user);
});

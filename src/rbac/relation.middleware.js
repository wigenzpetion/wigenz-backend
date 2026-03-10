const { ensureTeamAccess } = require("./team-access.service");

function requireTeamMembership(teamCode, options = {}) {
  return async (req, res, next) => {
    try {
      await ensureTeamAccess(req.user, {
        ...options,
        teamCode
      });

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  requireTeamMembership
};

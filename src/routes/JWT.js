const accessToken = jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
import express from 'express';
const userRouter = express.Router();

/* GET users listing. */
userRouter.get('/', (req, res) => {
    res.send('respond with a resource');
});

export default userRouter;

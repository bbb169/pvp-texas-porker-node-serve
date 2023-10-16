import express from 'express';
const indexRouter = express.Router();

/* test. */
indexRouter.get('/', (req, res) => {
    res.send('respond with a resource');
});

export default indexRouter;
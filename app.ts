import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import bodyParser from 'body-parser';
import indexRouter from './routes';

const app = express();

// 视图引擎设置
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// 配置中间件
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({
    limit: '10000kb',
    extended: true,
    parameterLimit: 50000,
}));
// 配置静态资源路径
app.use(express.static('public'));

app.use('/index', indexRouter);

// 捕捉404并转发到错误处理器
app.use((___, __, next) => {
    next(createError(404));
});

// 错误处理器
app.use(function (err, req, res) {
    // 设置本地变量，仅在开发环境提供错误信息
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // 渲染错误页面
    res.status(err.status || 500);
    res.render('error');
} as express.ErrorRequestHandler);

// 导出 app 模块
export default app;
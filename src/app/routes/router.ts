/**
 * ルーター
 */
import * as express from 'express';

import accountsRouter from './accounts';
import actionsRouter from './actions';
import devRouter from './dev';
import eventsRouter from './events';
import healthRouter from './health';
import ordersRouter from './orders';
import organizationsRouter from './organizations';
import ownershipInfosRouter from './ownershipInfos';
import peopleRouter from './people';
import meRouter from './people/me';
import placesRouter from './places';
import programMembershipsRouter from './programMembership';
import sellersRouter from './sellers';
import tasksRouter from './tasks';
import placeOrderTransactionsRouter from './transactions/placeOrder';
import returnOrderTransactionsRouter from './transactions/returnOrder';
import userPoolsRouter from './userPools';

const router = express.Router();

// middleware that is specific to this router
// router.use((req, res, next) => {
//   debug('Time: ', Date.now())
//   next()
// })

router.use('/health', healthRouter);
router.use('/accounts', accountsRouter);
router.use('/actions', actionsRouter);
router.use('/organizations', organizationsRouter);
router.use('/orders', ordersRouter);
router.use('/ownershipInfos', ownershipInfosRouter);
router.use('/people/me', meRouter);
router.use('/people', peopleRouter);
router.use('/places', placesRouter);
router.use('/programMemberships', programMembershipsRouter);
router.use('/events', eventsRouter);
router.use('/sellers', sellersRouter);
router.use('/tasks', tasksRouter);
router.use('/transactions/placeOrder', placeOrderTransactionsRouter);
router.use('/transactions/returnOrder', returnOrderTransactionsRouter);
router.use('/userPools', userPoolsRouter);

// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
if (process.env.NODE_ENV !== 'production') {
    router.use('/dev', devRouter);
}

export default router;

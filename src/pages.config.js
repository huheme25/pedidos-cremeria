import ClientOrders from './pages/ClientOrders';
import NewOrder from './pages/NewOrder';
import OrderDetail from './pages/OrderDetail';
import WarehouseOrders from './pages/WarehouseOrders';
import WarehouseOrderDetail from './pages/WarehouseOrderDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ClientOrders": ClientOrders,
    "NewOrder": NewOrder,
    "OrderDetail": OrderDetail,
    "WarehouseOrders": WarehouseOrders,
    "WarehouseOrderDetail": WarehouseOrderDetail,
}

export const pagesConfig = {
    mainPage: "ClientOrders",
    Pages: PAGES,
    Layout: __Layout,
};
import ClientOrders from './pages/ClientOrders';
import NewOrder from './pages/NewOrder';
import OrderDetail from './pages/OrderDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ClientOrders": ClientOrders,
    "NewOrder": NewOrder,
    "OrderDetail": OrderDetail,
}

export const pagesConfig = {
    mainPage: "ClientOrders",
    Pages: PAGES,
    Layout: __Layout,
};
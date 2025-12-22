import ClientOrders from './pages/ClientOrders';
import NewOrder from './pages/NewOrder';
import OrderDetail from './pages/OrderDetail';
import WarehouseOrders from './pages/WarehouseOrders';
import WarehouseOrderDetail from './pages/WarehouseOrderDetail';
import SellerOrders from './pages/SellerOrders';
import SellerOrderDetail from './pages/SellerOrderDetail';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import AdminOrderDetail from './pages/AdminOrderDetail';
import AdminClients from './pages/AdminClients';
import AdminProducts from './pages/AdminProducts';
import AdminUsers from './pages/AdminUsers';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ClientOrders": ClientOrders,
    "NewOrder": NewOrder,
    "OrderDetail": OrderDetail,
    "WarehouseOrders": WarehouseOrders,
    "WarehouseOrderDetail": WarehouseOrderDetail,
    "SellerOrders": SellerOrders,
    "SellerOrderDetail": SellerOrderDetail,
    "AdminDashboard": AdminDashboard,
    "AdminOrders": AdminOrders,
    "AdminOrderDetail": AdminOrderDetail,
    "AdminClients": AdminClients,
    "AdminProducts": AdminProducts,
    "AdminUsers": AdminUsers,
}

export const pagesConfig = {
    mainPage: "ClientOrders",
    Pages: PAGES,
    Layout: __Layout,
};
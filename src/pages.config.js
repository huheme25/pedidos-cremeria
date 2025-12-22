import AdminClients from './pages/AdminClients';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrderDetail from './pages/AdminOrderDetail';
import AdminOrders from './pages/AdminOrders';
import AdminProducts from './pages/AdminProducts';
import AdminUsers from './pages/AdminUsers';
import ClientOrders from './pages/ClientOrders';
import NewOrder from './pages/NewOrder';
import OrderDetail from './pages/OrderDetail';
import SellerOrderDetail from './pages/SellerOrderDetail';
import SellerOrders from './pages/SellerOrders';
import WarehouseOrderDetail from './pages/WarehouseOrderDetail';
import WarehouseOrders from './pages/WarehouseOrders';
import AdminProductsImport from './pages/AdminProductsImport';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminClients": AdminClients,
    "AdminDashboard": AdminDashboard,
    "AdminOrderDetail": AdminOrderDetail,
    "AdminOrders": AdminOrders,
    "AdminProducts": AdminProducts,
    "AdminUsers": AdminUsers,
    "ClientOrders": ClientOrders,
    "NewOrder": NewOrder,
    "OrderDetail": OrderDetail,
    "SellerOrderDetail": SellerOrderDetail,
    "SellerOrders": SellerOrders,
    "WarehouseOrderDetail": WarehouseOrderDetail,
    "WarehouseOrders": WarehouseOrders,
    "AdminProductsImport": AdminProductsImport,
}

export const pagesConfig = {
    mainPage: "ClientOrders",
    Pages: PAGES,
    Layout: __Layout,
};
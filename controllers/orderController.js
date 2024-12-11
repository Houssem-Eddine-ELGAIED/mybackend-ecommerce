import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';

// @desc     Créer une nouvelle commande
// @method   POST
// @endpoint /api/v1/orders
// @access   Private
const addOrderItems = async (req, res, next) => {
  try {
    const {
      cartItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      totalPrice
    } = req.body;

    // Fixer taxPrice à 0
    const taxPrice = 0;

    if (!cartItems || cartItems.length === 0) {
      res.statusCode = 400;
      throw new Error('No order items.');
    }

    // Si totalPrice n'est pas fourni dans la requête, on le calcule
    const calculatedTotalPrice = totalPrice || itemsPrice + shippingPrice + taxPrice;

    // Créer la commande
    const order = new Order({
      user: req.user._id,
      orderItems: cartItems.map(item => ({
        ...item,
        product: item._id
      })),
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,  // Taxe fixée à 0
      shippingPrice,
      totalPrice: calculatedTotalPrice  // Calculer ou utiliser le totalPrice existant
    });

    // Sauvegarder la commande dans la base de données
    const createdOrder = await order.save();

    // Réduire le stock des produits commandés
    for (const item of cartItems) {
      const product = await Product.findById(item._id);
      if (product) {
        product.stock -= item.qty;  // Réduire le stock
        await product.save();
      }
    }

    // Répondre avec la commande créée
    res.status(201).json(createdOrder);
  } catch (error) {
    next(error);  // Passer l'erreur au middleware de gestion des erreurs
  }
};

// @desc     Mettre à jour la commande pour la marquer comme payée
// @method   PUT
// @endpoint /api/v1/orders/:id/pay
// @access   Private
const updateOrderToPaid = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const { paidAt, paymentId, email } = req.body;  // Informations de paiement

    // Rechercher la commande
    const order = await Order.findById(orderId);

    if (!order) {
      res.statusCode = 404;
      throw new Error('Order not found!');
    }

    // Mettre à jour les informations de paiement
    order.isPaid = true;
    order.paidAt = paidAt ? new Date(paidAt) : new Date();  // Utiliser la date fournie ou la date actuelle
    order.paymentResult = {
      paymentId,
      status: 'paid',
      email_address: email
    };

    // Sauvegarder la commande mise à jour
    const updatedOrder = await order.save();

    // Ajouter une logique pour marquer la commande comme livrée le jour suivant
    const deliveryDate = new Date(updatedOrder.paidAt);
    deliveryDate.setDate(deliveryDate.getDate() + 1);  // Définir la date de livraison au jour suivant

    // Mettre à jour la commande pour la marquer comme livrée
    updatedOrder.isDelivered = true;
    updatedOrder.deliveredAt = deliveryDate;

    // Sauvegarder la commande après modification
    const finalUpdatedOrder = await updatedOrder.save();

    res.status(200).json(finalUpdatedOrder);  // Retourner la commande mise à jour
  } catch (error) {
    next(error);  // Passer l'erreur au middleware de gestion des erreurs
  }
};

// @desc     Mettre à jour la commande pour la marquer comme livrée
// @method   PUT
// @endpoint /api/v1/orders/:id/deliver
// @access   Private/Admin
const updateOrderToDeliver = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const { deliveredAt } = req.body;  // Date de livraison

    // Rechercher la commande
    const order = await Order.findById(orderId);

    if (!order) {
      res.statusCode = 404;
      throw new Error('Order not found!');
    }

    // Mettre à jour le statut de livraison
    order.isDelivered = true;
    order.deliveredAt = deliveredAt ? new Date(deliveredAt) : new Date(); // Utiliser la date fournie ou la date actuelle

    // Sauvegarder la commande après modification
    const updatedOrder = await order.save();

    res.status(200).json(updatedOrder);  // Retourner la commande mise à jour
  } catch (error) {
    next(error);  // Passer l'erreur au middleware de gestion des erreurs
  }
};

// @desc     Obtenir toutes les commandes
// @method   GET
// @endpoint /api/v1/orders
// @access   Private/Admin
const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().populate('user', 'id name');

    if (!orders || orders.length === 0) {
      res.statusCode = 404;
      throw new Error('Orders not found!');
    }

    res.status(200).json(orders);
  } catch (error) {
    next(error);  // Passer l'erreur au middleware de gestion des erreurs
  }
};

// @desc     Obtenir une commande par ID
// @method   GET
// @endpoint /api/v1/orders/:id
// @access   Private
const getOrderById = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;

    const order = await Order.findById(orderId).populate('user', 'name email');

    if (!order) {
      res.statusCode = 404;
      throw new Error('Order not found!');
    }

    res.status(200).json(order);
  } catch (error) {
    next(error);  // Passer l'erreur au middleware de gestion des erreurs
  }
};

// @desc     Obtenir les commandes de l'utilisateur connecté
// @method   GET
// @endpoint /api/v1/orders/my-orders
// @access   Private
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id });

    if (!orders || orders.length === 0) {
      res.statusCode = 404;
      throw new Error('No orders found for the logged-in user.');
    }

    res.status(200).json(orders);
  } catch (error) {
    next(error);  // Passer l'erreur au middleware de gestion des erreurs
  }
};

export {
  addOrderItems,
  getMyOrders,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDeliver,
  getOrders
};

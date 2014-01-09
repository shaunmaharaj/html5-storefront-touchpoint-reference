/**
 * Copyright Elastic Path Software 2013.
 *
 * Default Checkout Controller
 * The MVC controller instantiates the checkout model and views, renders checkout views in destinated regions.
 * It also manages events and functions to
 *    - select different
 *        -- billing or shipping address,
 *        -- shipping options,
 *        -- and payment options;
 *    - add new billing address;
 *    - and submit purchase order.
 */

define(function (require) {
    var ep = require('ep');
    var EventBus = require('eventbus');
    var Mediator = require('mediator');
    var Backbone = require('backbone');
    var pace = require('pace');
    var i18n = require('i18n');

    var Model = require('checkout.models');
    var View = require('checkout.views');
    var template = require('text!modules/base/checkout/base.checkout.templates.html');

    $('#TemplateContainer').append(template);
    _.templateSettings.variable = 'E';

    /**
     * Instantiate an checkout DefaultLayout and load views into corresponding regions
     * @returns {View.DefaultLayout}  fully rendered checkout DefaultLayout
     */
    var defaultView = function () {
      // Attempt to retrieve an order link from session storage (set by the checkout module)
      var orderLink = ep.io.sessionStore.getItem('orderLink');

      // Trigger an error if we are unable to retrieve a Cortex order link
      if (!orderLink) {
        EventBus.trigger('checkout.checkoutAccessError');
      }

      pace.start();
      var checkoutLayout = new View.DefaultLayout();
      var checkoutModel = new Model.CheckoutModel();

      checkoutModel.fetch({
        url: checkoutModel.getUrl(orderLink),
        success: function () {

          // If the model suggests we need to set a chosen billing address, trigger a call to Cortex to formerly set it
          // to allow the correct tax calculations to be made.
          if (checkoutModel.get('billingAddresses').length && checkoutModel.get('billingAddresses')[0].setAsDefaultChoice) {
            EventBus.trigger(
              'checkout.updateChosenAddressRequest',
              checkoutModel.get('billingAddresses')[0].selectAction
            );
          }

          // If the model suggests we need to set a chosen shipping address, trigger a call to Cortex to formerly set it
          // to allow the correct tax calculations to be made.
          if (checkoutModel.get('shippingAddresses').length && checkoutModel.get('shippingAddresses')[0].setAsDefaultChoice) {
            EventBus.trigger(
              'checkout.updateChosenAddressRequest',
              checkoutModel.get('shippingAddresses')[0].selectAction
            );
          }

          // If the model suggests we need to set a chosen shipping option, trigger a call to Cortex to formerly set it
          // to allow the correct shipping cost calculations to be made.
          if (checkoutModel.get('shippingOptions').length && checkoutModel.get('shippingOptions')[0].setAsDefaultChoice) {
            EventBus.trigger(
              'checkout.updateChosenShippingOptionRequest',
              checkoutModel.get('shippingOptions')[0].selectAction
            );
          }

          checkoutLayout.checkoutTitleRegion.show(new View.CheckoutTitleView());

          checkoutLayout.billingAddressesRegion.show(
            new View.BillingAddressesCompositeView({
              collection: new Backbone.Collection(checkoutModel.get('billingAddresses'))
            })
          );

          // Only show if the cart contains physical items requiring shipment
          if (checkoutModel.get('deliveryType') === "SHIPMENT") {
            checkoutLayout.shippingAddressesRegion.show(
              new View.ShippingAddressesCompositeView({
                collection: new Backbone.Collection(checkoutModel.get('shippingAddresses'))
              })
            );
            // Only populate the shipping options region if there is at least one shipping address
            if (checkoutModel.get('shippingAddresses').length > 0) {
              checkoutLayout.shippingOptionsRegion.show(
                new View.ShippingOptionsCompositeView({
                  collection: new Backbone.Collection(checkoutModel.get('shippingOptions'))
                })
              );
            }
          }

          var checkoutSummaryView = new View.CheckoutSummaryView({
            model: new Backbone.Model(checkoutModel.get('summary'))
          });

          checkoutSummaryView.on('show', function() {
            // Only show taxes summary if tax amount is greater than zero
            if ( (checkoutModel.get('summary').taxes.length) &&
                 (checkoutModel.get('summary').taxes[0].amount > 0) ) {
              checkoutSummaryView.checkoutTaxTotalRegion.show(
                new View.CheckoutTaxTotalView({
                  model: new Backbone.Model(checkoutModel.get('summary').taxTotal)
                })
              );
              checkoutSummaryView.checkoutTaxBreakDownRegion.show(
                new View.CheckoutTaxesCollectionView({
                  collection: new Backbone.Collection(checkoutModel.get('summary').taxes)
                })
              );
            }
            // If there are shipping costs, show them in the checkout summary
            if (checkoutModel.get('summary').shippingTotal) {
                checkoutSummaryView.checkoutShippingTotalRegion.show(
                  new View.CheckoutShippingTotalView({
                    model: new Backbone.Model(checkoutModel.get('summary').shippingTotal)
                  })
                );
            }
          });

          checkoutLayout.checkoutOrderRegion.show(checkoutSummaryView);
        }
      });

      return checkoutLayout;
    };

    /* ************** EVENT LISTENER FUNCTIONS ***************** */
    /**
     * Submit order to cortex.
     * @param submitOrderLink action-link to submit order to.
     */
    function submitOrder(submitOrderLink) {
      if (!submitOrderLink) {
        // FIXME [CU-92] user feedback??
        ep.logger.warn('checkout.submitOrderRequest called with no submitOrderLink');
        return;
      }

      var ajaxModel = new ep.io.defaultAjaxModel({
        type: 'POST',
        url: submitOrderLink,
        success: function (data, textStatus, XHR) {
          // Remove order link data from sessionStorage
          ep.io.sessionStore.removeItem('orderLink');

          var obj = {
            data: data,
            textStatus: textStatus,
            XHR: XHR
          };
          EventBus.trigger('checkout.submitOrderSuccess', obj);
        },
        customErrorFn: function () {
          EventBus.trigger('checkout.submitOrderFailed');
        }
      });

      ep.io.ajax(ajaxModel.toJSON());
    }

    /**
     * Fire mediator event to handle subsequent actions.
     * @param response  submit order success response
     */
    function submitOrderSuccess(response) {

      var orderSummaryLink = response.XHR.getResponseHeader('Location');
      if (orderSummaryLink) {
        Mediator.fire('mediator.orderProcessSuccess', orderSummaryLink);
        pace.stop();
      }
    }

    /* ********** SUBMIT ORDER EVENT LISTENERS ************ */
    /**
     * Listening to submit order button clicked signal,
     * will trigger event to submit order to cortex
     */
    EventBus.on('checkout.submitOrderBtnClicked', function (submitOrderActionLink) {
      View.setCheckoutButtonProcessing();
      // if cortex says it's ok
      if (submitOrderActionLink) {
        EventBus.trigger('checkout.submitOrderRequest', submitOrderActionLink);
      }
    });

    /**
     * Listening to submit order request,
     * will submit purchase order to cortex.
     */
    EventBus.on('checkout.submitOrderRequest', submitOrder);

    /**
     * Listening to submit order success signal,
     * will fire mediator event to handle subsequent actions.
     */
    EventBus.on('checkout.submitOrderSuccess', submitOrderSuccess);

    /**
     * Listening to submit order failed signal,
     * will reset checkout button back from activity indicator to
     */
    EventBus.on('checkout.submitOrderFailed', function() {
      // FIXME [CU-112] should also notify user if submit fails
      View.resetCheckoutButtonText();
    });

    /**
     * Listening to the event fired when we are unable to load the order data.
     * Routes the user to the cart.
     */
    EventBus.on('checkout.checkoutAccessError', function() {
      ep.logger.error('unable to load checkout - missing order link data');
      ep.router.navigate(ep.app.config.routes.cart, true);
    });

    /* ********** CHOOSE (BILLING/SHIPPING) ADDRESS EVENT LISTENERS ************ */
    /**
     * Handler for the checkout.addressRadioChanged event.
     */
    EventBus.on('checkout.addressRadioChanged', function(actionLink) {
      EventBus.trigger('checkout.updateChosenAddressRequest', actionLink);
    });

    EventBus.on('checkout.updateChosenAddressRequest', function(actionLink) {
      if (actionLink) {
        var ajaxModel = new ep.io.defaultAjaxModel({
          type: 'POST',
          url: actionLink,
          success: function() {
            EventBus.trigger('checkout.updateChosenAddressSuccess');
          },
          customErrorFn: function() {
            EventBus.trigger('checkout.updateChosenAddressFailed');
          }
        });

        ep.io.ajax(ajaxModel.toJSON());
      }
    });

    /**
     * Listening to the event fired when the update of a chosen (billing or shipping) address fails.
     * Displays a toast error message.
     */
    EventBus.on('checkout.updateChosenAddressFailed', function(response) {
      ep.logger.error('error updating selected address: ' + response);

      // Display sticky error message
      $().toastmessage('showToast', {
        text: i18n.t('checkout.updateChosenBillingAddressErrMsg'),
        sticky: true,
        position: 'middle-center',
        type: 'error'
      });
    });

    /**
     * Listening to the event fired on successful update of the chosen (billing or shipping) address.
     * Triggers a page reload to update the tax and total data in checkout summary.
     */
    EventBus.on('checkout.updateChosenAddressSuccess', function() {
      Backbone.history.loadUrl();
    });

    /* ********** SHIPPING OPTION EVENT LISTENERS ************ */
    /**
     * Handler for the checkout.shippingOptionRadioChanged event.
     */
    EventBus.on('checkout.shippingOptionRadioChanged', function(actionLink) {
      EventBus.trigger('checkout.updateChosenShippingOptionRequest', actionLink);
    });

    EventBus.on('checkout.updateChosenShippingOptionRequest', function(actionLink) {
      if (actionLink) {
        var ajaxModel = new ep.io.defaultAjaxModel({
          type: 'POST',
          url: actionLink,
          success: function() {
            EventBus.trigger('checkout.updateChosenShippingOptionSuccess');
          },
          customErrorFn: function() {
            EventBus.trigger('checkout.updateChosenShippingOptionFailed');
          }
        });

        ep.io.ajax(ajaxModel.toJSON());
      }
    });

    /**
     * Listening to the event fired on successful update of the chosen shipping option.
     * Triggers a page reload to update the shipping cost and total data in checkout summary.
     */
    EventBus.on('checkout.updateChosenShippingOptionSuccess', function() {
      Backbone.history.loadUrl();
    });

    /**
     * Listening to the event fired when the update of a chosen (billing or shipping) address fails.
     * Displays a toast error message.
     */
    EventBus.on('checkout.updateChosenShippingOptionFailed', function(response) {
      ep.logger.error('error updating selected shipping option: ' + response);

      // Display sticky error message
      $().toastmessage('showToast', {
        text: i18n.t('checkout.updateChosenShippingOptionErrMsg'),
        sticky: true,
        position: 'middle-center',
        type: 'error'
      });
    });


    /* ********** ADD NEW ADDRESS EVENT LISTENERS ************ */
    /**
     * Listen to add new address button clicked signal
     * will load address form
     */
    EventBus.on('checkout.addNewAddressBtnClicked', function () {
      Mediator.fire('mediator.addNewAddressRequest', 'checkout');
    });

    return {
      DefaultView: defaultView
    };
  }
);
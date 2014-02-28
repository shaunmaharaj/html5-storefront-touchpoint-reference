/**
 * Copyright © 2014 Elastic Path Software Inc. All rights reserved.
 * Functional Storefront Unit Test - Payment Component Controller
 */
define(function (require) {
  var Backbone = require('backbone');
  var ep = require('ep');

  var controller = require('payment');
  var view = require('payment.views');
  var template = require('text!modules/base/components/payment/base.component.payment.template.html');

  describe('Payment Controller: DefaultCreatePaymentController', function () {

    describe('has an order link', function () {
      before(function () {
        $("#Fixtures").append(template); // append templates
        ep.io.sessionStore.setItem('orderLink', 'fakeOrderLink');

        sinon.stub(Backbone.Model.prototype, 'fetch');

        this.view = controller.DefaultCreatePaymentController();
        this.view.render();
      });

      after(function () {
        $("#Fixtures").empty();
        ep.io.sessionStore.removeItem('orderLink');
        Backbone.Model.prototype.fetch.restore();
      });

      it('Model should have fetched info from server once', function () {
        expect(Backbone.Model.prototype.fetch).to.be.calledOnce;
      });
      it('should return a view that is an instance of DefaultPaymentFormView', function () {
        expect(this.view).to.be.an.instanceOf(view.DefaultPaymentFormView);
      });
      it('returned view should have a model', function () {
        expect(this.view.model).to.be.ok;
      });

    });

    describe('has no order Link', function () {
      before(function () {
        ep.router = new Marionette.AppRouter();
        sinon.stub(ep.logger, 'error');
        sinon.stub(ep.router, 'navigate');

        $("#Fixtures").append(template); // append templates
        this.view = controller.DefaultCreatePaymentController();
      });

      after(function () {
        $("#Fixtures").empty();
        ep.logger.error.restore();
        ep.router.navigate.restore();
      });

      it('logs an error', function() {
        expect(ep.logger.error).to.be.calledOnce;
      });
      it('navigates to cart page', function() {
        expect(ep.router.navigate).to.be.calledWith(ep.app.config.routes.cart);
      });
    });


  });

});
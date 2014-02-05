/**
 * Copyright © 2014 Elastic Path Software Inc. All rights reserved.
 *
 *
 * Address Component Controller
 * The HTML5 Reference Storefront's MVC controller for displaying an address, and creating an address.
 */

define(function (require) {
  var ep = require('ep');
  var i18n = require('i18n');
  var EventBus = require('eventbus');
  var Mediator = require('mediator');

  var Views = require('address.views');
  var Models = require('address.models');
  var template = require('text!modules/base/components/address/base.component.address.template.html');

  $('#TemplateContainer').append(template);

  _.templateSettings.variable = 'E';

  var countryCollection = new Models.CountryCollection();
  var regionCollection = new Models.RegionCollection();

  var addressFormView = new Views.DefaultAddressFormView();

  /**
   * Instantiate an DefaultCreateAddressLayout and load views into corresponding regions on DefaultCreateAddressLayout.
   * @returns {Views.DefaultCreateAddressLayout} fully rendered DefaultCreateAddressLayout
   */
  var defaultCreateAddressView = function () {
    // Ensure the user is authenticated before rendering the address form
    if (ep.app.isUserLoggedIn()) {
      var addressModel = new Models.CreateAddressModel();
      var addressLayout = new Views.DefaultCreateAddressLayout({
        model: addressModel
      });

      addressModel.fetch({
        success: function(response) {
          addressModel = response;
          addressLayout.addressFormRegion.show(defaultAddressFormView(response));
        }
      });

      return addressLayout;

    } else {
      Mediator.fire('mediator.loadRegionContent', 'loginModal');
    }
  };

  /**
   * Instantiate an DefaultEditAddressLayout and load views into corresponding regions on DefaultEditAddressLayout.
   * @returns {Views.DefaultEditAddressLayout} fully rendered DefaultEditAddressLayout
   */
  var defaultEditAddressView = function(href) {
    var addressModel = new Models.AddressModel();
    var addressLayout = new Views.DefaultEditAddressLayout({
      model: addressModel
    });

    addressModel.fetch({
      url: ep.ui.decodeUri(href),
      success: function(response) {
        addressModel = response;
        addressLayout.addressFormRegion.show(defaultAddressFormView(response));
      }
    });

    return addressLayout;
  };

  /**
   * Instantiate a DefaultAddressFormView and load country and regions views into corresponding regions.
   * @param addressModel  data model of address to edit.
   * @returns {Views.DefaultAddressFormView}  fully rendered DefaultAddressFormView
   */
  var defaultAddressFormView = function (addressModel) {
    var countriesView = new Views.DefaultCountriesView();
    var regionsView = new Views.DefaultRegionsView({
      collection: regionCollection
    });

    addressFormView.model = addressModel;

    countryCollection.fetch({
      success: function (response) {
        if (addressModel && addressModel.get('country')) {
          var countryCode = addressModel.get('country');
          var regionCode = addressModel.get('region');

          var regionsLink = getRegionLink(response, countryCode);
          EventBus.trigger('address.updateChosenCountryRequest', countryCode, regionsLink, regionCode);
        }
        else {
          regionCollection.reset();
        }

        countriesView.collection = response;

        addressFormView.countriesRegion.show(countriesView);
        addressFormView.regionsRegion.show(regionsView);
      }
    });

    function getRegionLink(collection, code) {
      var link;

      var selectedCountry = collection.where({name: code})[0];
      if (selectedCountry) {
        link = selectedCountry.get('regionLink');
      }
      else {
        ep.logger.warn('No country with given countryCode (' + code + ') was found while retrieving regionLink');
      }
      return link;
    }

    return addressFormView;
  };

  /* *********** Event Listeners: load display address view  *********** */
  /**
   * Listening to load default display address view request,
   * will load the default view in appMainRegion.
   */
  EventBus.on('address.loadAddressesViewRequest', loadAddressView);

  /**
   * Renders a Default Address ItemView with regions and models passed in
   * @param addressObj  contains region to render in and the model to render with
   */
  function loadAddressView(addressObj) {
    try {
      var addressView = new Views.DefaultAddressItemView({
        model: addressObj.model
      });

      addressObj.region.show(addressView);
    } catch (error) {
      ep.logger.error('failed to load Address Views: ' + error.message);
    }
  }

  /* *************** Event Listeners: update chosen country / regions *************** */
  EventBus.on('address.countrySelectionChanged', function(selectedCountry, regionsLink, selectedRegion) {
    EventBus.trigger('address.updateChosenCountryRequest', selectedCountry, regionsLink, selectedRegion);
  });

  EventBus.on('address.regionSelectionChanged', function(selectedRegion) {
    EventBus.trigger('address.updateChosenRegionRequest', selectedRegion);
  });

  EventBus.on('address.updateChosenCountryRequest', function(selectedCountry, regionsLink, selectedRegion) {
    setSelectedCountry(selectedCountry);

    if (addressFormView.regionsRegion.currentView) {
      ep.ui.startActivityIndicator(addressFormView.regionsRegion.currentView, 'small');
    }

    fetchRegionCollection(regionsLink, selectedRegion);
  });

  EventBus.on('address.updateChosenRegionRequest', function(selectedRegion) {
    setSelectedRegion(selectedRegion);
  });

  function fetchRegionCollection(regionsLink, selectedRegion) {
    if(selectedRegion && !regionsLink) {
      ep.logger.error('Fail to fetch regions collection, missing regions link');
      return;
    }

    if (regionsLink) {
      regionCollection.fetch({
        url: regionCollection.getUrl(regionsLink),
        success: function(response) {
          if (selectedRegion) {
            EventBus.trigger('address.updateChosenRegionRequest', selectedRegion);
          }

          ep.ui.stopActivityIndicator(addressFormView.regionsRegion.currentView);
        }
      });
    }
    else {
      regionCollection.reset();
      ep.ui.stopActivityIndicator(addressFormView.regionsRegion.currentView);
    }

  }

  function setSelectedCountry(selectedCountry) {
    var deselect = countryCollection.where({selected: true})[0];
    if (deselect) {
      deselect.unset('selected');
    }

    var selected = countryCollection.where({name: selectedCountry})[0];
    selected.set('selected', true);
  }

  function setSelectedRegion(selectedRegion) {
    var deselect = regionCollection.where({selected: true})[0];
    if (deselect) {
      deselect.unset('selected');
    }

    var selected = regionCollection.where({name: selectedRegion})[0];
    selected.set('selected', true);
  }

  /* *************** Event Listeners: create address  *************** */
  /**
   * Listening to create address button clicked signal,
   * will trigger request to get address form (to get action link to post form to)
   */
  EventBus.on('address.createAddressBtnClicked', function (href) {
    debugger;
    EventBus.trigger('address.submitAddressRequest', 'POST', href);
  });

  /**
   * Listening to create address button clicked signal,
   * will trigger request to get address form (to get action link to post form to)
   */
  EventBus.on('address.editAddressBtnClicked', function(href) {
    EventBus.trigger('address.submitAddressRequest', 'PUT', href);
  });

  /**
   * Listening to create new address request,
   * will submit address form to cortex,
   */
  EventBus.on('address.submitAddressRequest', function(method, href) {
    submitAddressRequest(method, href);
  });

  /**
   * Listening to address form submission failed signal (general error),
   * will display generic error message.
   */
  EventBus.on('address.submitAddressFormFailed', function () {
    Views.displayAddressFormErrorMsg(i18n.t('addressForm.errorMsg.generalSaveAddressFailedErrMsg'));
  });

  /**
   * Listening to address form submission failed signal (invalid form),
   * will display error message sent back from cortex.
   * @param errMsg an error message, or a i18n key to the error message
   */
  EventBus.on('address.submitAddressFormFailed.invalidFields', function (errMsg) {
    // in the future, also highlight the invalid input box
    var translatedMsg = Views.translateErrorMessage(errMsg);
    Views.displayAddressFormErrorMsg(translatedMsg);
  });

  /**
   * Listening to submit address form success signal,
   * will call mediator strategy to notify storefront addressForm module is done.
   */
  EventBus.on('address.submitAddressFormSuccess', function() {
    Mediator.fire('mediator.addressFormComplete');
  });

  /**
   * Listen to cancel button clicked signal,
   * will redirect page set by returnUrl.
   */
  EventBus.on('address.cancelBtnClicked', function() {
    Mediator.fire('mediator.addressFormComplete');
  });

  /**
   * Send an address request to cortex.
   * @param type The AJAX type of the request POST (create) or PUT (update)
   * @param submitAddressFormLink to POST the request to.
   */
  function submitAddressRequest(type, submitAddressFormLink) {
    var form = Views.getAddressFormValues();

    var ajaxModel = new ep.io.defaultAjaxModel({
      type: type,
      url: submitAddressFormLink,
      data: JSON.stringify(form),
      success: function () {
        EventBus.trigger('address.submitAddressFormSuccess');
      },
      customErrorFn: function (response) {
        if (response.status === 400) {
          EventBus.trigger('address.submitAddressFormFailed.invalidFields', response.responseText);
        }
        else {
          EventBus.trigger('address.submitAddressFormFailed');
        }
      }
    });

    ep.io.ajax(ajaxModel.toJSON());
  }


  return{
    DefaultCreateAddressView: defaultCreateAddressView,
    DefaultEditAddressView: defaultEditAddressView,
    testVariables: {
      defaultAddressFormView: defaultAddressFormView
    }
  };
});
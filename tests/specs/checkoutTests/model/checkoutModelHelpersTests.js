/**
 * Copyright © 2014 Elastic Path Software Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * Functional Storefront Unit Test - Checkout Models
 */
define(function (require) {
  var ep = require('ep');

  var models = require('checkout.models');
  var dataJSON = require('text!../../../../tests/data/checkout.json');
  var modelHelpers = models.testVariable.modelHelpers;

  describe('model helper functions', function() {
    var data = JSON.parse(_.clone(dataJSON)).response;

    describe('setChosenEntity', function() {
      describe('given an billing addresses array with a chosen address', function() {
        before(function() {
          // The default checkout JSON data contains a chosen billing address
          this.parsedBillingAddresses = modelHelpers.parseCheckoutAddresses(data, "billingaddressinfo");
        });

        after(function() {
          delete(this.parsedBillingAddresses);
        });

        it('returns the addresses array unchanged', function() {
          expect(modelHelpers.setChosenEntity(this.parsedBillingAddresses)).to.be.eql(this.parsedBillingAddresses);
        });
      });
      describe('given an billing addresses array without a chosen address', function() {
        before(function() {
          // Remove the chosen address object from (a deep copy of) the checkout test data
          this.rawData = JSON.parse(JSON.stringify(data));
          delete(this.rawData._billingaddressinfo[0]._selector[0]._chosen);

          // A parsed addresses array without chosen address for comparison
          this.parsedBillingAddresses = modelHelpers.parseCheckoutAddresses(this.rawData, "billingaddressinfo");

          this.parsedBillingAddressesWithDefault =  modelHelpers.setChosenEntity(
            modelHelpers.parseCheckoutAddresses(this.rawData, "billingaddressinfo")
          );
        });

        after(function() {
          delete(this.parsedBillingAddresses);
          delete(this.parsedBillingAddressesWithDefault);
        });

        it('returns a modified addresses array', function() {
          expect(this.parsedBillingAddressesWithDefault).to.not.be.eql(this.parsedBillingAddresses);
        });
        it('adds a "setAsDefaultChoice" property to the first address in the array', function() {
          expect(this.parsedBillingAddressesWithDefault[0]).to.have.property('setAsDefaultChoice');
        });
      });
    });

    describe('sortByAscAlphabeticOrder', function() {
      describe('given an unsorted addresses array and a property name string to sort by', function() {
        before(function() {
          // The default checkout JSON data contains an unordered set of billing addresses
          this.rawData = _.extend({}, data);
          this.sortProperty = "streetAddress";

          sinon.spy(_, 'sortBy');

          this.parsedBillingAddresses = modelHelpers.parseCheckoutAddresses(this.rawData, "billingaddressinfo");

          this.testCaseInsensitiveSortedAddresses = _.sortBy(this.parsedBillingAddresses, function(addressObj) {
            return addressObj[this.sortProperty].toLowerCase();
          }, this);

          this.sortedAddresses = modelHelpers.sortByAscAlphabeticOrder(this.parsedBillingAddresses, this.sortProperty);
        });

        after(function() {
          // Clean up the test variables created
          delete(this.rawData);
          delete(this.sortProperty);
          delete(this.parsedBillingAddresses);

          _.sortBy.restore();
        });

        it('calls underscore\'s sortBy function with the billing addresses array', function() {
          expect(_.sortBy).to.be.calledWith(this.parsedBillingAddresses);
        });
        it('returns a case-insensitive sorted array of billing addresses', function() {
          expect(this.sortedAddresses).to.eql(this.testCaseInsensitiveSortedAddresses);
        });
      });
      describe('given an addresses array and a sort property of undefined', function() {
        before(function() {
          this.rawData = _.extend({}, data);
          sinon.spy(_, 'sortBy');

          this.parsedBillingAddresses = modelHelpers.parseCheckoutAddresses(this.rawData, "billingaddressinfo");

          this.sortByAscAlphabeticOrder = modelHelpers.sortAddresses(this.parsedBillingAddresses, undefined);
        });
        after(function() {
          delete(this.parsedBillingAddresses);
          delete(this.sortedAddresses);
          _.sortBy.restore();
        });
        it('calls underscore\'s sortBy function with the billing addresses array', function() {
          expect(_.sortBy).to.be.calledWith(this.parsedBillingAddresses);
        });
        it('returns an unchanged billing addresses array', function() {
          expect(this.sortedAddresses).to.eql(this.parsedBillingAddresses);
        });
      });
    });

    describe('parseShippingOptions', function() {
      describe('given a valid JSON response', function() {
        before(function() {
          this.rawData = _.clone(data);
          this.numChosenPaymentMethods = 0;

          this.parsedPaymentMethods = modelHelpers.parseShippingOptions(this.rawData);

          var numShippingOptions = this.parsedPaymentMethods.length;

          // Search the array of parsed shipping options for an object with a chosen property
          while(numShippingOptions--) {
            if (_.has(this.parsedPaymentMethods[numShippingOptions], 'chosen')) {
              this.numChosenPaymentMethods += 1;
            }
          }
        });
        after(function() {
          delete(this.parsedPaymentMethods);
        });
        it('returns an array with the correct number of shipping options objects', function() {
          // The raw checkout JSON data contains 2 shipping options
          expect(this.parsedPaymentMethods.length).to.eql(2);
        });
        it('returns an array with a chosen shipping option object', function() {
          expect(this.numChosenPaymentMethods).to.eql(1);
        });
        it('returns an array where all choice shipping options have selectAction properties', function() {
          var numShippingOptions = this.parsedPaymentMethods.length;
          var isMissingSelectAction = false;

          // Search the array of parsed shipping option objects for choice options without selectAction properties
          while(numShippingOptions--) {
            var currentObj = this.parsedPaymentMethods[numShippingOptions];

            // if this is a choice address
            if (!_.has(currentObj, 'chosen')) {
              if (!_.has(currentObj, 'selectAction')) {
                isMissingSelectAction = true;
              }
            }
          }
          expect(isMissingSelectAction).to.be.false;
        });
      });

      describe('given an undefined JSON response parameter', function(){
        before(function() {
          sinon.stub(ep.logger, 'error');
          this.parsedPaymentMethods = modelHelpers.parseShippingOptions(undefined);
        });
        after(function() {
          delete(this.parsedPaymentMethods);
          ep.logger.error.restore();
        });
        it('returns an empty array and logs an error', function() {
          expect(this.parsedPaymentMethods).to.eql([]);
          expect(ep.logger.error).to.be.called;
        });
      });
    });

    describe('sortShippingOptions', function() {
      describe('given an unordered array of shipping option objects and two sort properties', function() {
        before(function() {
          // Create an unordered array of shipping option objects
          this.unorderedShippingOptions = [
            {
              "carrier": "Canada Post",
              "costAmount": 15.55,
              "costDisplay": "$15.55",
              "displayName": "Canada Post Express",
              "selectAction": "fakeAction"
            },
            {
              "carrier": "Canada Post",
              "costAmount": 2.78,
              "costDisplay": "$2.78",
              "displayName": "Canada Post Two Days",
              "selectAction": "fakeAction"
            },
            {
              "carrier": "Canada Post",
              "costAmount": 2.78,
              "costDisplay": "$2.78",
              "displayName": "Canada Post Regular Parcel",
              "selectAction": "fakeAction"
            }
          ];
          this.sortedShippingOptions = modelHelpers.sortShippingOptions(this.unorderedShippingOptions, "costAmount", "displayName");
        });
        after(function() {
          delete(this.unorderedShippingOptions);
        });

        it('returns a sorted array of shipping option objects', function() {
          expect(this.sortedShippingOptions[0].displayName).to.be.eql("Canada Post Regular Parcel");
          expect(this.sortedShippingOptions[1].displayName).to.be.eql("Canada Post Two Days");
          expect(this.sortedShippingOptions[2].displayName).to.be.eql("Canada Post Express");
        });

        describe('given sort properties that do not exist', function() {
          before(function() {
            this.sortedShippingOptions = modelHelpers.sortShippingOptions(
              this.unorderedShippingOptions,
              "noSuchProperty",
              "fakeProperty"
            );
          });
          it('returns the original array of shipping option objects unchanged', function() {
            expect(this.sortedShippingOptions).to.be.eql(this.unorderedShippingOptions);
          });
        });
      });
    });

    describe('parsePaymentMethods', function() {
      describe('given a valid JSON response', function() {
        before(function() {
          this.rawData = _.clone(data);
          this.numChosenPaymentMethods = 0;

          this.parsedPaymentMethods = modelHelpers.parsePaymentMethods(this.rawData);
          var numPaymentMethods = this.parsedPaymentMethods.length;

          // Search the array of parsed shipping options for an object with a chosen property
            while(numPaymentMethods--) {
              if (_.has(this.parsedPaymentMethods[numPaymentMethods], 'chosen')) {
                this.numChosenPaymentMethods += 1;
              }
            }
          });
          after(function() {
            delete(this.parsedPaymentMethods);
          });
          it('returns an array with the correct number of shipping options objects', function() {
            // The raw checkout JSON data contains 2 shipping options
            expect(this.parsedPaymentMethods.length).to.eql(2);
          });
          it('returns an array with a chosen payment method object', function() {
            expect(this.numChosenPaymentMethods).to.eql(1);
          });
          it('returns an array where all choice payment methods have selectAction properties', function() {
            var numPaymentMethods = this.parsedPaymentMethods.length;
            var isMissingSelectAction = false;

            // Search the array of parsed shipping option objects for choice options without selectAction properties
            while(numPaymentMethods--) {
              var currentObj = this.parsedPaymentMethods[numPaymentMethods];

              // if this is a choice address
              if (!_.has(currentObj, 'chosen')) {
                if (!_.has(currentObj, 'selectAction')) {
                  isMissingSelectAction = true;
                }
              }
            }
            expect(isMissingSelectAction).to.be.false;
          });
        });

        describe('given an undefined JSON response parameter', function(){
          before(function() {
            sinon.stub(ep.logger, 'error');
            this.parsedPaymentMethods = modelHelpers.parseShippingOptions(undefined);
          });
          after(function() {
            delete(this.parsedPaymentMethods);
            ep.logger.error.restore();
          });
          it('returns an empty array and logs an error', function() {
            expect(this.parsedPaymentMethods).to.eql([]);
            expect(ep.logger.error).to.be.called;
          });
        });
      });
    });

});

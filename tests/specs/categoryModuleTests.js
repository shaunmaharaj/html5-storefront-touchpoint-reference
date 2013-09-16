/**
 * Copyright © 2013 Elastic Path Software Inc. All rights reserved.

 * User: ama
 * Date: 26/09/05
 * Time: 8:03 PM
 *
 */

define(function(require) {
  describe ('UI Storefront Category Module  ', function () {

    /*
     * Test Category Controller
     */
    describe ('UI Storefront Category Controller', function () {

      var categoryController = require('category');
      describe("DefaultView",function(){
        var defaultView = new categoryController.DefaultView();
        it('DefaultView should exist',function(){
          expect(defaultView).to.exist;
        });
      });
    });

    /*
     * Test presence of Category Views and Regions
     */
    describe ('UI Storefront Category View', function () {
      var categoryViews = require('modules/category/category.views');

      describe('DefaultView and Regions', function () {
        var defaultView = new categoryViews.DefaultView();
        it('DefaultView should exist', function () {
          expect(defaultView).to.exist;
        });
        it('DefaultView should have a categoryTitleRegion region', function () {
          expect(defaultView.categoryTitleRegion).to.exist;
        });
        it('DefaultView should have a categoryBrowseRegion region', function () {
          expect(defaultView.categoryBrowseRegion).to.exist;
        });
        it('DefaultView should have a categoryPaginationTopRegion region', function () {
          expect(defaultView.categoryPaginationTopRegion).to.exist;
        });
        it('DefaultView should have a categoryPaginationBottomRegion region', function () {
          expect(defaultView.categoryPaginationBottomRegion).to.exist;
        });
      });

      it('CategoryTitleView should exist', function () {
        expect(categoryViews.CategoryTitleView).to.exist;
      });
      it('CategoryItemCollectionView should exist', function () {
        expect(categoryViews.CategoryItemCollectionView).to.exist;
      });
      it('CategoryItemView should exist', function () {
        expect(categoryViews.CategoryItemView).to.exist;
      });
      it('CategoryPaginationView should exist', function () {
        expect(categoryViews.CategoryPaginationView).to.exist;
      });
    });


    /*
     * Test Category Model
     */
    describe ('UI Storefront Category Model', function () {
      var categoryModel = require('modules/category/category.models');
      it("CategoryModel should exist",function(){
        expect(categoryModel.CategoryModel).to.exist;
      });
      it("CategoryItemPageModel should exist",function(){
        expect(categoryModel.CategoryItemPageModel).to.exist;
      });
      it("CategoryPaginationModel should exist",function(){
        expect(categoryModel.CategoryPaginationModel).to.exist;
      });
      it("CategoryItemCollectionModel should exist",function(){
        expect(categoryModel.CategoryItemCollectionModel).to.exist;
      });
    });

  });
});
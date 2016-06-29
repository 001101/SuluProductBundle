/*
 * This file is part of the Sulu CMS.
 *
 * (c) MASSIVE ART WebServices GmbH
 *
 * This source file is subject to the MIT license that is bundled
 * with this source code in the file LICENSE.
 */

define([
    'config',
    'suluproduct/models/product-addon',
    'text!suluproduct/components/products/components/addons/overlay.html',
    'text!suluproduct/components/products/components/addons/price.html'
], function(Config, ProductAddon, OverlayTemplate, PriceTemplate) {
    'use strict';

    var currencies = null,

        constants = {
            datagridInstanceName: 'product-addon-datagrid',
            toolbarInstanceName: 'product-addon-oolbar',
            overlayInstanceName: 'product-addon-overlay',
            selectInstanceName: 'product-addon-select'
        },

        currentSelectedAddon = null,
        currentProductAddon = null,

        // TODO check if needed, maybe move to constants
        addonId = null,
        actions = {
            ADD: 1,
            DELETE: 2,
            UPDATE: 3
        },

        /**
         * TODO check
         * bind custom events
         */
        bindCustomEvents = function() {
            this.sandbox.on('sulu.toolbar.delete', function() {
                this.sandbox.emit('sulu.product.delete', this.options.data.id);
            }.bind(this));

            this.sandbox.on('product.state.change', function(status) {
                if (!this.options.data ||
                    !this.options.data.attributes.status ||
                    this.options.data.attributes.status.id !== status.id
                ) {
                    this.status = status;
                    this.options.data.attributes.status = this.status;
                    setHeaderBar.call(this, false);
                }
            }, this);

            this.sandbox.on('sulu.toolbar.save', function() {
                this.sendData = {};
                this.sendData.status = this.status;
                this.sendData.id = this.options.data.id;
                save.call(this);
            }, this);

            this.sandbox.on('sulu.products.saved', function(data) {

                var addons = data.addons;

                // Select action
                if (data.action === actions.ADD) {
                    // ADD RECORD IN DATAGRID
                    var addon = _.findWhere(addons, {'addonId': data.addonIdAdded});
                    this.sandbox.emit('husky.datagrid.' + constants.datagridInstanceName + '.record.add', addon);
                } else if (data.action === actions.DELETE) {
                    // DELETE RECORDs IN DATAGRID
                    $.each(data.addonIdsDeleted, function(key, id) {
                        this.sandbox.emit('husky.datagrid.' + constants.datagridInstanceName + '.record.remove', id);
                    }.bind(this));
                } else if (data.action === actions.UPDATE) {
                    // UPDATE DATAGRID WITH RECEIVED RECORDS
                    this.sandbox.emit('husky.datagrid.' + constants.datagridInstanceName + '.records.set', addons);
                }

                setHeaderBar.call(this, true);
                //this.options.data = data;
                this.options.data.attributes.status = this.status;
            }, this);

            // enable toolbar items
            this.sandbox.on('husky.datagrid.' + constants.datagridInstanceName + '.number.selections', function(number) {
                var postfix = number > 0 ? 'enable' : 'disable';
                this.sandbox.emit(
                    'husky.toolbar.' + constants.toolbarInstanceName + '.item.' + postfix,
                    'delete',
                    false)
            }, this);

            // auto-complete search: item selected
            this.sandbox.on('husky.auto-complete.addons-search.select', function(selectedAddon) {
                var selectedAddon = $.getJSON('api/products/' + selectedAddon.id + '?locale=' + this.options.locale);

                selectedAddon.done(function(data) {
                    startOverlayPricesComponent.call(this, data, null);
                }.bind(this));
            }.bind(this));
        },

        /**
         * TODO check
         * @param {Boolean} saved defines if saved state should be shown
         */
        setHeaderBar = function(saved) {
            if (saved !== this.saved) {
                if (!!saved) {
                    this.sandbox.emit('sulu.header.toolbar.item.disable', 'save', true);
                } else {
                    this.sandbox.emit('sulu.header.toolbar.item.enable', 'save', false);
                }
            }
            this.saved = saved;
        },

        /**
         * Create overlay content for addon overlay.
         */
        createOverlayContent = function() {
            addonId = null;

            // create container for overlay
            var $overlayContent = this.sandbox.dom.createElement(this.sandbox.util.template(OverlayTemplate, {
                translate: this.sandbox.translate
            }));
            this.sandbox.dom.append(this.$el, $overlayContent);

            return $overlayContent;
        },

        /**
         * Retrieve currencies.
         */
        retrieveCurrencies = function() {
            if (!this.currenciesRequest) {
                var currenciesUrl = 'api/currencies?flat=true&locale=' + this.options.locale;
                this.currenciesRequest = $.getJSON(currenciesUrl, function(data) {
                    currencies = data._embedded.currencies;
                }.bind(this));
            }

            return this.currenciesRequest;
        },

        /**
         * TODO check
         * save product addons
         */
        save = function() {
            this.saved = false;
            this.sandbox.emit('sulu.products.save', this.sendData);
        },

        /**
         * Called when OK on overlay was clicked, saves the product addon.
         */
        overlayOkClicked = function() {
            var productAddon = new ProductAddon();
            var httpType = 'post';

            // exit if no addon is selected in overlay
            if (currentSelectedAddon === null) {
                return;
            }

            if (currentProductAddon !== null) {
                productAddon.set({id: currentProductAddon.id});
                httpType = 'put';
            }

            productAddon.set({addon: currentSelectedAddon.id});

            var prices = [];
            retrieveCurrencies.call(this).done(function() {
                this.sandbox.util.foreach(currencies, function(currency) {
                    var $overwrittenCheckbox = this.sandbox.dom.find('#change-price-' + currency.code, this.$el);

                    if (!!$overwrittenCheckbox[0] && $overwrittenCheckbox[0].checked) {
                        var price = {};
                        price.currency = currency.code;
                        price.value = this.sandbox.dom.val('#addon-price-' + currency.code);

                        prices.push(price);
                    }
                }.bind(this));
            }.bind(this));

            productAddon.set({prices: prices});

            productAddon.saveToProduct(this.options.data.id, {
                type: httpType,
                success: function(response) {
                    //TODO update list
                }.bind(this),
                error: function() {
                    //TODO show error
                }.bind(this)
            });

            productAddon.destroy();
        },

        /**
         * TODO check
         * delete action function from toolbar
         */
        removeSelected = function() {
            this.sandbox.emit('husky.datagrid.' + constants.datagridInstanceName + '.items.get-selected', function(ids) {

                var addons = this.options.data.attributes.addons;
                this.sendData = {};
                var addonIdsDeleted = [];

                _.each(ids, function(value, key, list) {
                    var result = _.findWhere(addons, {'addonId': value});
                    addons = _.without(addons, result);
                    addonIdsDeleted.push(value);
                });

                this.sendData.addonIdsDeleted = addonIdsDeleted;
                this.sendData.addons = addons;
                this.sendData.status = this.status;
                this.sendData.id = this.options.data.id;
                this.sendData.action = actions.DELETE;

                save.call(this);
            }.bind(this));
        },

        /**
         * Starts the component for addon prices.
         *
         * @param {object} selectedAddon Product that was selected to be added as add on in the auto-complete search.
         * @param {object} productAddon Already existent product addon entity (only for edit).
         */
        startOverlayPricesComponent = function(selectedAddon, productAddon) {
            currentSelectedAddon = selectedAddon;
            currentProductAddon = productAddon;

            retrieveCurrencies.call(this).done(function() {
                var priceRows = [];
                var priceRow = null;
                var defaultPrices = {};
                var productAddonPrices = {};
                var $pricesEl;

                this.sandbox.util.foreach(selectedAddon.prices, function(defaultPrice) {
                    defaultPrices[defaultPrice.currency.code] = defaultPrice.price;
                }.bind(this));

                if (productAddon !== null) {
                    this.sandbox.util.foreach(productAddon.prices, function(productAddonPrice) {
                        productAddonPrices[productAddonPrice.currency.code] = productAddonPrice.price;
                    }.bind(this));
                }

                this.sandbox.util.foreach(currencies, function(currency) {
                    priceRow = {};
                    priceRow.id = currency.id;
                    priceRow.defaultPrice = (!!defaultPrices[currency.code] ? defaultPrices[currency.code] : 0);
                    priceRow.price = (!!productAddonPrices[currency.code] ? productAddonPrices[currency.code] : priceRow.defaultPrice);
                    priceRow.currencyCode = currency.code;
                    priceRow.overwritten = (priceRow.defaultPrice == priceRow.price ? false : true);

                    priceRows.push(priceRow);
                    priceRow = null;
                }.bind(this));

                $pricesEl = this.$find('#addon-price-list');

                // Add price rows.
                this.sandbox.util.foreach(priceRows, function(priceRow) {
                    priceRow.translate = this.sandbox.translate;
                    var $el = this.sandbox.util.template(PriceTemplate, priceRow);
                    this.sandbox.dom.append($pricesEl, $el);
                }.bind(this));
            }.bind(this));
        },

        /**
         * Starts the auto-complete component which is shown in the add/edit overlay.
         *
         * @param {object} productAddon
         */
        startOverlayAutoCompleteComponent = function(productAddon) {
            var autoCompleteOptions;

            autoCompleteOptions = Config.get('suluproduct.components.autocomplete.default');
            autoCompleteOptions.instanceName = 'addons-search';
            autoCompleteOptions.el = '#addons-search-field';
            autoCompleteOptions.remoteUrl = '/admin/api/products?flat=true&searchFields=number,name&fields=id,name,number&type=3';
            autoCompleteOptions.noNewValues = true;

            if (null !== productAddon) {
                autoCompleteOptions.value = productAddon.addon;
            }

            this.sandbox.start([
                {
                    name: 'auto-complete@husky',
                    options: autoCompleteOptions
                }
            ]);
        },

        /**
         * Show edit/new overlay.
         *
         * @param {object} productAddon
         */
        showOverlay = function(productAddon) {
            // Create overlay.
            var $overlayContent = createOverlayContent.call(this);

            // Start auto-complete component.
            startOverlayAutoCompleteComponent.call(this, productAddon);

            // Start overlay component.
            var $overlay = this.sandbox.dom.createElement('<div>');
            this.sandbox.dom.append(this.$el, $overlay);

            this.sandbox.start([
                {
                    name: 'overlay@husky',
                    options: {
                        el: $overlay,
                        supportKeyInput: false,
                        title: this.sandbox.translate('product.addon.overlay.title'),
                        skin: 'wide',
                        openOnStart: true,
                        removeOnClose: true,
                        instanceName: constants.overlayInstanceName,
                        data: $overlayContent,
                        okCallback: overlayOkClicked.bind(this)
                    }
                }
            ]);

            // Edit: disable addon search, show prices immediately.
            if (productAddon !== null) {
                // Wait until search is initialized to disable input.
                this.sandbox.once('husky.auto-complete.addons-search.initialized', function() {
                    this.sandbox.dom.attr(this.$find('#addons-search'), 'disabled', 'disabled');
                }.bind(this));

                startOverlayPricesComponent.call(this, productAddon.addon, productAddon);
            }
        },

        /**
         * Show add overlay.
         */
        showAddOverlay = function() {
            showOverlay.call(this, null);
        },

        /**
         * Show edit overlay.
         *
         * @param {number} id
         */
        showEditOverlay = function(id) {
            var ajaxRequest = $.getJSON('api/addons/' + id + '?locale=' + this.options.locale);

            ajaxRequest.done(function(data) {
                console.error(data);
                showOverlay.call(this, data);
            }.bind(this));

            ajaxRequest.fail(function() {
                console.log('Error retrieving addon from server');
            }.bind(this));
        },

        /**
         * Calls toolbar and list components.
         */
        startListComponents = function() {
            this.sandbox.sulu.initListToolbarAndList.call(
                this,
                'addons',
                'api/addon/fields',
                {
                    el: '#product-addons-toolbar',
                    instanceName: constants.toolbarInstanceName,
                    hasSearch: false,
                    template: this.sandbox.sulu.buttons.get({
                        add: {
                            options: {
                                callback: showAddOverlay.bind(this)
                            }
                        },
                        deleteSelected: {
                            options: {
                                callback: removeSelected.bind(this)
                            }
                        }
                     })
                },
                {
                    el: '#product-addons-list',
                    url: 'api/products/' + this.options.data.id + '/addons?flat=true',
                    instanceName: constants.datagridInstanceName,
                    resultKey: 'addons',
                    actionCallback: showEditOverlay.bind(this),
                    viewOptions: {
                        table: {
                            selectItem: {
                                type: 'checkbox'
                            }
                        }
                    }
                }
            );
        },

        /**
         * Initializes the addons list.
         */
        initList = function() {
            this.sandbox.start('#product-addons-form');
            startListComponents.call(this);
        };

    return {
        name: 'Sulu Product Addons View',

        templates: ['/admin/product/template/product/addons'],

        render: function() {
            this.sandbox.dom.html(this.$el, this.renderTemplate(this.templates[0]));
            initList.call(this);
        },

        initialize: function() {
            bindCustomEvents.call(this);

            if (!!this.options.data) {
                this.status = this.options.data.attributes.status;
            } else {
                this.status = Config.get('product.status.inactive');
            }

            // reset status if it has been changed before and has not been saved
            this.sandbox.emit('product.state.change', this.status);
            this.render();
            setHeaderBar.call(this, true);
        }
    };
});

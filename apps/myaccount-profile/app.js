define(function(require){
	var $ = require('jquery'),
		_ = require('underscore'),
		monster = require('monster'),

		templates = {
			menu: 'menu',
			profile: 'profile'
		};

	var app = {

		name: 'myaccount-profile',

		i18n: [ 'en-US' ],

		requests: {
			'profile.getUser': {
				url: 'accounts/{accountId}/users/{userId}',
				verb: 'GET'
			},
			'profile.updateUser': {
				url: 'accounts/{accountId}/users/{userId}',
				verb: 'POST'
			},
			'profile.getAccount': {
				url: 'accounts/{accountId}',
				verb: 'GET'
			},
			'profile.updateAccount': {
				url: 'accounts/{accountId}',
				verb: 'POST'
			},
			'profile.getBilling': {
				url: 'accounts/{accountId}/braintree/customer',
				verb: 'GET'
			},
			'profile.updateBilling': {
				url: 'accounts/{accountId}/braintree/customer',
				verb: 'POST'
			}
		},

		subscribe: {
			'myaccount-profile.renderContent': '_renderContent'
		},

		load: function(callback){
			var self = this;

			self.initApp(function() {
				callback && callback(self);
			});
		},

		initApp: function(callback) {
			var self = this;

			monster.pub('auth.initApp', {
				app: self,
				callback: callback
			});
		},

		render: function(callback){
			var self = this,
				dataTemplate = {
					accountName: monster.apps['auth'].currentAccount.name || ''
				},
				profileMenu = $(monster.template(self, 'menu', dataTemplate)),
			    args = {
			    	name: self.name,
			    	title: self.i18n.active().title,
					menu: profileMenu,
					weight: 1,
					category: 'accountCategory'
				};

			monster.pub('myaccount.addSubmodule', args);

			callback && callback();
		},

		_renderContent: function(args) {
			var self = this;

			monster.parallel({
					billing: function(callback) {
						monster.request({
							resource: 'profile.getBilling',
							data: {
								accountId: self.accountId
							},
							success: function(data, status) {
								callback(null, data.data);
							},
							error: function(data, status) {
								/* For some people billing is not via braintree, but we still ned to display the tab */
								callback(null, {});
							}
						});
					},
					user: function(callback) {
						monster.request({
							resource: 'profile.getUser',
							data: {
								accountId: monster.apps['auth'].originalAccount.id,
								userId: self.userId
							},
							success: function(data, status) {
								callback(null, data.data);
							}
						});
					},
					account: function(callback) {
						monster.request({
							resource: 'profile.getAccount',
							data: {
								accountId: self.accountId
							},
							success: function(data, status) {
								callback(null, data.data);
							}
						});
					}
				},
				function(err, results) {
					results = self.formatData(results);

					var profile = $(monster.template(self, 'profile', results));

					self.bindEvents(profile, results);

					monster.pub('myaccount.renderSubmodule', profile);

					if(args.uiTab) {
						profile.find('a[href="#'+args.uiTab+'"]').tab('show');
					}

					if(typeof args.callback === 'function') {
						args.callback(profile);
					}
				}
			);
		},

		cleanFormData: function(module, data) {
			if(module === 'billing') {
				data.credit_card.expiration_date = data.extra.expiration_date.month + '/' + data.extra.expiration_date.year;
			}

			delete data.extra;

			return data;
		},

		updateData: function(type, data, newData, success, error) {
			var self = this,
				params = {
					accountId: self.accountId,
					data: $.extend(true, {}, data, newData)
				};

			if(type === 'user') {
				params.accountId = monster.apps['auth'].originalAccount.id;
				params.userId = self.userId;
			}
			else if(type === 'billing') {
				params.data = newData;
			}

			monster.request({
				resource: 'profile.update'+(type.slice(0,1).toUpperCase() + type.substr(1)),
				data: params,
				success: function(_data, status) {
					if(typeof success == 'function') {
						success(_data, status);
					}
				},
				error: function(_data, status) {
					if(typeof error == 'function') {
						error(_data, status);
					}
				}
			});
		},

		formatData: function(data) {
			data.uiRestrictions = monster.apps['auth'].originalAccount.ui_restrictions || {};

			if(! _.isEmpty(data.billing) ) {
				data.billing.credit_card = data.billing.credit_cards[0] || {};

				/* If There is a credit card stored, we fill the fields with * */
				if(data.billing.credit_card.last_four) {
					data.billing.credit_card.fake_number = '************'+data.billing.credit_card.last_four;
					data.billing.credit_card.fake_cvv = '***';
					data.billing.credit_card.type = data.billing.credit_card.card_type.toLowerCase();
				}
			}
			else {
				data.uiRestrictions.profile = $.extend(data.uiRestrictions.profile || {}, { show_billing: false });
			}

			return data;
		},

		bindEvents: function(parent, data) {
			var self = this,
				profile = parent,
				liSettings = profile.find('li.settings-item'),
				liContent = liSettings.find('.settings-item-content'),
				aSettings = liSettings.find('a.settings-link'),
				closeContent = function() {
					liSettings.removeClass('open');
					liContent.slideUp('fast');
					aSettings.find('.update .text').text(self.i18n.active().editSettings);
					aSettings.find('.update i').removeClass('icon-remove').addClass('icon-cog');
					liSettings.find('.uneditable').show();
					liSettings.find('.edition').hide();
				},
				successUpdating = function(key, parent) {
					profile = parent;

					var link = profile.find('li[data-name='+key+']');

					if(key === 'credit_card') {
						profile.find('.edition').hide();
						profile.find('.uneditable').show();
					}

					link.find('.update').hide();
					link.find('.changes-saved').show()
												.fadeOut(1500, function() {
											   		link.find('.update').fadeIn(500);
											  	});

					link.css('background-color', '#22ccff')
						   .animate({
							backgroundColor: '#f6f6f6'
						}, 2000
					);

					liContent.hide();
					aSettings.show();
				},
				settingsValidate = function(fieldName, dataForm, callbackSuccess, callbackError) {
					var validate = true,
						error = false;

					if(fieldName === 'password') {
						if(!(dataForm.password === dataForm.confirm_password)) {
							error = self.i18n.active().passwords_not_matching;
						}
						else if(!winkstart.is_password_valid(dataForm.password)) {
							/* No need to display error since the password mechanism already does that for us */
							validate = false;
						}
					}

					if(error && typeof callbackError === 'function') {
						callbackError(error);
					}
					else if(validate === true && error === false && typeof callbackSuccess === 'function') {
						callbackSuccess();
					}
				},
				getCardType = function(number) {
					var reg_visa = new RegExp('^4[0-9]{12}(?:[0-9]{3})?$'),
						reg_mastercard = new RegExp('^5[1-5][0-9]{14}$'),
						reg_amex = new RegExp('^3[47][0-9]{13}$'),
						reg_discover = new RegExp('^6(?:011|5[0-9]{2})[0-9]{12}$');
						//regDiners = new RegExp('^3(?:0[0-5]|[68][0-9])[0-9]{11}$'),
						//regJSB= new RegExp('^(?:2131|1800|35\\d{3})\\d{11}$');


					if(reg_visa.test(number))
						return 'visa';
					if (reg_mastercard.test(number))
						return 'mastercard';
					if (reg_amex.test(number))
						return 'amex';
					if (reg_discover.test(number))
						return 'discover';
					/*if (reg_diners.test(number))
						return 'DINERS';
					if (reg_JSB.test(number))
						return 'JSB';*/
				   return false;
				};

			profile.find('.change').on('click', function(e) {
				e.preventDefault();

				var currentElement = $(this),
					module = currentElement.data('module'),
					uiTab = currentElement.parents('.tab-pane').first().attr('id'),
					fieldName = currentElement.data('field'),
					newData = self.cleanFormData(module, form2object('form_'+fieldName));

				settingsValidate(fieldName, newData, function() {
						self.updateData(module, data[module], newData,
							function(data) {
								var args = {
									uiTab: uiTab,
									callback: function(parent) {
										successUpdating(fieldName, parent);

										/* TODO USELESS? */
										if(typeof callbackUpdate === 'function') {
											callbackUpdate();
										}
									}
								};

								monster.pub('myaccount-profile.renderContent', args);
							},
							function(dataError) {
								monster.ui.friendlyError(dataError);
							}
						);
					},
					function(error) {
						monster.ui.alert(error);
					}
				);
			});

			profile.find('.edit-credit-card').on('click', function(e) {
				e.preventDefault();

				profile.find('.edition').show();
				profile.find('.uneditable').hide();
				displayCardType('');
			});

			var displayCardType = function(cardNumber) {
				var type = getCardType(cardNumber);

				if(type === false) {
					profile.find('.edition .card-type').hide();
					profile.find('.add-on i').show();
				}
				else if(!(profile.find('.card-type.'+type).is(':visible'))) {
					profile.find('.edition .card-type').hide();
					profile.find('.add-on i').hide();
					profile.find('.edition .card-type.'+type).css('display', 'inline-block');
				}
			};

			profile.find('#credit_card_number').on('keyup', function(e) {
				displayCardType($(this).val());
			});

			profile.find('#credit_card_number').on('paste', function(e) {
				var currentElement = $(this);
				//Hack for paste event: w/o timeout, the value is set to undefined...
				setTimeout(function() {
					displayCardType(currentElement.val());
				}, 0);
			});

			profile.find('#profile_settings a').on('click', function (e) {
				e.preventDefault();
				closeContent();

				$(this).tab('show');
			});

			profile.find('li.settings-item .settings-link').on('click', function(e) {
				var $this = $(this),
					settingsItem = $this.parents('.settings-item'),
					isOpen = settingsItem.hasClass('open');

					closeContent();
					if(!isOpen){
						settingsItem.addClass('open');
						$this.find('.update .text').text(self.i18n.active().close);
						$this.find('.update i').removeClass('icon-cog').addClass('icon-remove');
						settingsItem.find('.settings-item-content').slideDown('fast');
	
						if(settingsItem.data('name') === 'credit_card') {
							/* If there is no credit-card data, we skip the step that just displays the creditcard info */
							if($.isEmptyObject(data.billing.credit_card)) {
								settingsItem.find('.uneditable').hide();
								settingsItem.find('.edition').show();
							}
						}
					}
			});

			profile.find('.cancel').on('click', function(e) {
				e.preventDefault();
				closeContent();

				$(this).parents('form').first().find('input').each(function(k, v) {
					var currentElement = $(v);
					currentElement.val(currentElement.data('original_value'));
				});

				e.stopPropagation();
			});
		}
	};

	return app;
});

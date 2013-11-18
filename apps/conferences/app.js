define(function(require){
	var $ = require('jquery'),
		_ = require('underscore'),
		hotkeys = require('hotkeys'),
		monster = require('monster'),
		timepicker = require('timepicker'),
		toastr = require('toastr'),
		wysiwyg = require('wysiwyg');

	var app = {

		name: 'conferences',

		i18n: [ 'en-US' ],

		requests: {
			'conferences.list': {
				url: 'accounts/{accountId}/conferences',
				verb: 'GET'
			},
			'conferences.get': {
				url: 'accounts/{accountId}/conferences/{conferenceId}',
				verb: 'GET'
			},
			'conferences.add': {
				url: 'accounts/{accountId}/conferences',
				verb: 'PUT'
			},
			'conferences.update': {
				url: 'accounts/{accountId}/conferences/{conferenceId}',
				verb: 'POST'
			},
			'conferences.delete': {
				url: 'accounts/{accountId}/conferences/{conferenceId}',
				verb: 'DELETE'
			},
			'conferences.getPins': {
				url: 'accounts/{accountId}/conferences/pins',
				verb: 'GET'
			},
			'conferences.listConferencesServers': {
				url: 'accounts/{accountId}/conferences_servers',
				verb: 'GET'
			},
			'conferences.createConferencesServer': {
				url: 'accounts/{accountId}/conferences_servers',
				verb: 'PUT'
			},
			'conferences.getConferencesServer': {
				url: 'accounts/{accountId}/conferences_servers/{conferencesServerId}',
				verb: 'GET'
			},
			'conferences.updateConferencesServer': {
				url: 'accounts/{accountId}/conferences_servers/{conferencesServerId}',
				verb: 'POST'
			},
			'conferences.view': {
				url: 'accounts/{accountId}/conferences/{conferenceId}/status',
				verb: 'GET'
			},
			'conferences.addParticipant': {
				url: 'accounts/{accountId}/conferences/{conferenceId}/add_participant',
				verb: 'POST'
			},
			'conferences.muteParticipant': {
				url: 'accounts/{accountId}/conferences/{conferenceId}/mute/{participantId}',
				verb: 'POST'
			},
			'conferences.unmuteParticipant': {
				url: 'accounts/{accountId}/conferences/{conferenceId}/unmute/{participantId}',
				verb: 'POST'
			},
			'conferences.deafParticipant': {
				url: 'accounts/{accountId}/conferences/{conferenceId}/deaf/{participantId}',
				verb: 'POST'
			},
			'conferences.undeafParticipant': {
				url: 'accounts/{accountId}/conferences/{conferenceId}/undeaf/{participantId}',
				verb: 'POST'
			},
			'conferences.kickParticipant': {
				url: 'accounts/{accountId}/conferences/{conferenceId}/kick/{participantId}',
				verb: 'POST'
			},
			'conferences.actionConference': {
				url: 'accounts/{accountId}/conferences/{conferenceId}/{action}',
				verb: 'POST'
			},
			'conferences.createNotification': {
				url: 'accounts/{accountId}/notify/conference_{notificationType}',
				verb: 'PUT',
				type: 'text/html',
				dataType: 'text/html'
			},
			'conferences.getNotification': {
				url: 'accounts/{accountId}/notify/conference_{notificationType}/{contentType}',
				verb: 'GET',
				type: 'text/html',
				dataType: 'text/html'
			},
			'conferences.updateNotification': {
				url: 'accounts/{accountId}/notify/conference_{notificationType}',
				verb: 'POST',
				type: 'text/html',
				dataType: 'text/html'
			}
		},

		subscribe: {
			'conferences.show': '_render'
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

		_render: function() {
			var self = this;
			self.render();
		},

		render: function(container){
			var self = this;

			if(self.userType === 'unregistered') {
				self.renderUserView(container);
			} else {
				self.renderAdminView(container);
			}
		},

		renderUserView: function(container){
			var self = this,
				container = container || $('#ws-content'),
				conferenceView = $(monster.template(self, 'app', { adminView:false }));

			container
				.empty()
				.append(conferenceView);

			self.renderViewConference(self.conferenceId);
		},

		renderAdminView: function(container){
			var self = this,
				container = container || $('#ws-content'),
				conferenceView = $(monster.template(self, 'app', { adminView:true }));

			self.bindEvents(conferenceView);

			self.renderActiveConference(conferenceView);
			conferenceView.find('#active_conferences').addClass('active');

			container
				.empty()
				.append(conferenceView);
		},

		//_util
		formatData: function(data) {
		},

		bindEvents: function(parent) {
			var self = this;

			parent.find('.left-menu .nav-item:not(.role)').on('click', function() {
				parent.find('.left-menu .nav-item').removeClass('active');
				$(this).addClass('active');
			});

			parent.find('#new_conference').on('click', function() {
				self.renderNewConference(parent);
			});

			parent.find('#upcoming_conferences').on('click', function() {
				self.renderUpcomingConferences(parent);
			});

			parent.find('#callin_numbers').on('click', function() {
				self.renderCallinNumbers(parent);
			});

			parent.find('#active_conferences').on('click', function() {
				self.renderActiveConference(parent);
			});

			parent.find('#customize_notifications').on('click', function() {
				self.renderCustomizeNotifications(parent);
			});
		},

		renderActiveConference: function(parent) {
			var self = this;

			monster.request({
				resource: 'conferences.list',
				data: {
					accountId: self.accountId
				},
				success: function (data, status) {
					var conferences = self.formatActiveConference(data.data),
						activeConfView = $(monster.template(self, 'activeConferences', { conferences: conferences }));

					self.bindActiveConferenceEvents(activeConfView, conferences);

					parent
						.find('.right-content')
						.empty()
						.append(activeConfView);
				}
			})
		},

		bindActiveConferenceEvents: function(parent, conferences) {
			var self = this,
				mapTimers = {};

			self.searchAsYouType('active', parent);

			_.each(conferences, function(conference) {
				mapTimers[conference.id] = {
					duration: conference.duration,
					timer: {}
				};

				mapTimers[conference.id].timer = setInterval(function() {
					target = parent.find('[data-id="'+conference.id+'"] td.duration');

					mapTimers[conference.id].duration++;

					/* As long as the page is displayed */
					if(parent.find('#active_conferences_content').size() > 0) {
						target.html(monster.util.friendlyTimer(mapTimers[conference.id].duration));
					}
					else {
						clearInterval(mapTimers[conference.id].timer);
						delete mapTimers[conference.id];
					}
				}, 1000);
			});

			parent.find('.view-conference').on('click', function() {
				self.renderViewConference($(this).parents('tr').first().data('id'));
			});
		},

		formatActiveConference: function(conferences) {
			var self = this,
				result = [];

			_.each(conferences, function(conference) {
				//Uncomment when API is working if(conference.active) {
					conference.duration = Math.floor(Math.random()*1000);
					conference.friendlyDuration = monster.util.friendlyTimer(conference.duration);
					result.push(conference);
				//}
			});

			result.sort(function (a, b) {
				return a.duration - b.duration;
			});

			return result;
		},

		renderUpcomingConferences: function(parent) {
			var self = this;

			monster.request({
				resource: 'conferences.list',
				data: {
					accountId: self.accountId
				},
				success: function(data, status) {
					var conferences = self.formatUpcomingConferences(data.data),
						upcomingConfView = $(monster.template(self, 'upcomingConferences', { conferences: conferences }));

					self.bindUpcomingConferencesEvents(upcomingConfView, parent);

					parent
						.find('.right-content')
						.empty()
						.append(upcomingConfView);
				}
			});
		},

		formatUpcomingConferences: function(conferences) {
			var currentTimestamp = monster.util.dateToGregorian(new Date()),
				result = [];

			_.each(conferences, function(item) {
				if(item.start > currentTimestamp) {
					var timestamp = monster.util.toFriendlyDate(item.start, 'standard');

					item.date = timestamp.match(/([0-9]+)\/([0-9]+)/)[0];
					item.startTime = timestamp.match(/([0-9]+):([0-9]+)\s(AM|PM)/)[0];
					result.push(item);
				}
			});

			result.sort(function(a,b) {
				return a.start - b.start;
			});

			return result;
		},

		bindUpcomingConferencesEvents: function(parent, appContainer) {
			var self = this;

			self.searchAsYouType('upcoming', parent);

			parent.find('.edit-conference-link').on('click', function(e) {
				self.editConference(appContainer, $(this).data('id'));
			});
		},

		refreshCallinNumbers: function(parent, data) {
			var self = this;

			var callinNumbersRows = $(monster.template(self, 'callinNumbersRows', data));

			parent
				.find('#callin_conferences_content tbody')
				.empty()
				.append(callinNumbersRows);
		},

		renderCallinNumbers: function(parent) {
			var self = this;

			monster.request({
				resource: 'conferences.listConferencesServers',
				data: {
					accountId: self.accountId
				},
				success: function(listConferencesServers) {
					var getConferencesServer = function(conferencesServerId) {
						monster.request({
							resource: 'conferences.getConferencesServer',
							data: {
								conferencesServerId: conferencesServerId,
								accountId: self.accountId
							},
							success: function(data) {
								var callinNumbersView = $(monster.template(self, 'callinNumbers', data.data));

								self.refreshCallinNumbers(callinNumbersView, data.data);

								self.bindCallinNumbersEvents(callinNumbersView, parent, data.data);

								parent
									.find('.right-content')
									.empty()
									.append(callinNumbersView);
							}
						});
					};

					if(listConferencesServers.data.length === 0) {
						monster.request({
							resource: 'conferences.createConferencesServer',
							data: {
								accountId: self.accountId,
								data: {
									name: 'Conference Server',
									numbers: {}
								}
							},
							success: function(conferencesServer) {
								getConferencesServer(conferencesServer.data.id);
							}
						});
					}
					else {
						getConferencesServer(listConferencesServers.data[0].id);
					}
				}
			});
		},

		renderAddCallinNumberDialog: function(parent, conferencesServerId) {
			var self = this,
				dialog = monster.ui.dialog(monster.template(self, 'addCallinNumberPopup'), {
					dialogClass: 'conference-dialog',
					dialogType: 'conference',
					title: self.i18n.active().popupTitles.callinNumber
				});

			dialog.find('#add_number').on('click', function() {
				var number = monster.util.unformatPhoneNumber(dialog.find('.phone-number').val());

				monster.request({
					resource: 'conferences.getConferencesServer',
					data: {
						conferencesServerId: conferencesServerId,
						accountId: self.accountId
					},
					success: function(data) {
						data.data.numbers[number] = {};

						monster.request({
							resource: 'conferences.updateConferencesServer',
							data: {
								conferencesServerId: conferencesServerId,
								accountId: self.accountId,
								data: data.data
							},
							success: function(data) {
								var templateToastr = monster.template(self, '!' + self.i18n.active().toastrMessages.successAddCallin, { number: monster.util.formatPhoneNumber(number) });

								toastr.success(templateToastr);

								dialog.dialog('destroy').remove();

								self.refreshCallinNumbers(parent, data.data);
							}
						});
					}
				});
			});
		},

		bindCallinNumbersEvents: function(parent, appContainer, data) {
			var self = this;

			self.searchAsYouType('callin', parent, 'phoneNumber');

			parent.find('#add_callin_number').on('click', function() {
				self.renderAddCallinNumberDialog(parent, data.id);
			});

			parent.on('click', '.remove-callin-number', function() {
				var number = $(this).parents('tr').data('id');

				monster.request({
					resource: 'conferences.getConferencesServer',
					data: {
						conferencesServerId: data.id,
						accountId: self.accountId
					},
					success: function(dataGet) {
						if('numbers' in dataGet.data) {
							delete dataGet.data.numbers[number];
						}

						monster.request({
							resource: 'conferences.updateConferencesServer',
							data: {
								conferencesServerId: dataGet.data.id,
								accountId: self.accountId,
								data: dataGet.data
							},
							success: function(dataPost) {
								var templateToastr = monster.template(self, '!' + self.i18n.active().toastrMessages.successDeleteCallin, { number: monster.util.formatPhoneNumber(number) });

								toastr.success(templateToastr);

								self.refreshCallinNumbers(parent, dataPost.data);
							}
						});
					}
				});
			});
		},

		searchAsYouType: function(type, parent, searchType) {
			parent.find('div#' + type + '_conferences_content').find('div.header').find('input').on('keyup', function() {
				var self = $(this),
					search;

				if(searchType && searchType === 'phoneNumber') {
					search = monster.util.unformatPhoneNumber(self.val().toLowerCase());
				}
				else {
					search = self.val().toLowerCase();
				}

				if(search) {
					var row,
						rowValue;

					_.each(parent.find('tbody').find('tr'), function(row) {
						row = $(row);

						rowValue = row.data('search');

						if(rowValue) {
							rowValue = rowValue.toString().toLowerCase();

							rowValue.indexOf(search) >= 0 ? row.show() : row.hide();
						}
					});
				}
				else {
					parent.find('tbody').find('tr').show();
				}
			});
		},

		renderCustomizeNotifications: function(parent) {
			var self = this;

			monster.parallel({
					invite: function(callback) {
						monster.request({
							resource: 'conferences.getNotification',
							data: {
								accountId: self.accountId,
								notificationType: 'invite',
								contentType: 'html'
							},
							success: function(data) {
								callback(null, data.response);
							},
							error: function(data) {
								callback(null);
							}
						});
					},
					update: function(callback) {
						monster.request({
							resource: 'conferences.getNotification',
							data: {
								accountId: self.accountId,
								notificationType: 'update',
								contentType: 'html'
							},
							success: function(data) {
								callback(null, data.response);
							},
							error: function(data) {
								callback(null);
							}
						});
					},
					summary: function(callback) {
						monster.request({
							resource: 'conferences.getNotification',
							data: {
								accountId: self.accountId,
								notificationType: 'summary',
								contentType: 'html'
							},
							success: function(data) {
								callback(null, data.response);
							},
							error: function(data) {
								callback(null);
							}
						});
					}
				},
				function(err, results) {
					var customizeNotificationsView = $(monster.template(self, 'customizeNotifications', results));

					parent
						.find('div.right-content')
						.empty()
						.append(customizeNotificationsView);

					self.renderWysiwyg(parent, results);

					self.bindCustomizeNotificationsEvents(parent, results);
				}
			);
		},

		bindCustomizeNotificationsEvents: function(parent, data) {
			var self = this,
				parent = parent.find('div#customize_notifications_content');

			parent.find('div.switch-link').on('click', function() {
				if (!$(this).hasClass('active')) {
					parent.find('div.switch-link.active').removeClass('active');
					$(this).addClass('active');
				}

				self.loadWysiwygContent(parent, data);
			});

			parent.find('> button').on('click', function() {
				var type = parent.find('div.switch-link.active').data('type'),
					request = ( data[type] ) ? 'update' : 'create';

				data[type] = parent.find('div#editor').html();

				function monsterRequest (requestType) {
					monster.request({
						resource: 'conferences.' + requestType + 'Notification',
						data: {
							accountId: self.accountId,
							notificationType: type,
							data: data[type]
						},
						success: function (data) {
							var toastrTemplate = monster.template(
													self,
													'!' + self.i18n.active().toastrMessages.saveNotificationSuccess,
													{
														type: type.charAt(0).toUpperCase() + type.slice(1),
														action: ( request == 'update' ) ? 'saved' : 'created'
													}
												);

							toastr.success(toastrTemplate);
						}
					});
				}

				monsterRequest(request);

			});
		},

		renderWysiwyg: function(parent, data) {
			var self = this,
				parent = parent.find('div#customize_notifications_content'),
				macro = {
							user_first_name: 'User\'s First Name',
							user_last_name: 'User\'s Last Name',
							user_pin: 'User\'s PIN',
							conference_name: 'Conference\'s Name',
							conference_date: 'Conference\'s Date',
							conference_time: 'Conference\'s Time',
							conference_record: 'Conference\'s Record'
						},
				macroTarget = parent.find('a[data-original-title=Macro]').siblings('ul.dropdown-menu'),
				colors = [
							'ffffff','000000','eeece1','1f497d','4f81bd','c0504d','9bbb59','8064a2','4bacc6','f79646','ffff00',
							'f2f2f2','7f7f7f','ddd9c3','c6d9f0','dbe5f1','f2dcdb','ebf1dd','e5e0ec','dbeef3','fdeada','fff2ca',
							'd8d8d8','595959','c4bd97','8db3e2','b8cce4','e5b9b7','d7e3bc','ccc1d9','b7dde8','fbd5b5','ffe694',
							'bfbfbf','3f3f3f','938953','548dd4','95b3d7','d99694','c3d69b','b2a2c7','b7dde8','fac08f','f2c314',
							'a5a5a5','262626','494429','17365d','366092','953734','76923c','5f497a','92cddc','e36c09','c09100',
							'7f7f7f','0c0c0c','1d1b10','0f243e','244061','632423','4f6128','3f3151','31859b','974806','7f6000'
						],
				colorTarget = parent.find('a[data-original-title="Font Color"]').siblings('div.color-menu'),
				msg = '';

			for (var key in macro) {
				macroTarget.append($('<li><a data-edit="insertHTML <b>{' + key + '}</b>">' + macro[key] + '</a></li>'));
			}

			for (var key in colors) {
				colorTarget.append($('<a data-edit="foreColor #' + colors[key] + '" style="background-color: #' + colors[key] + ';"></a>'));
			}

			parent.find('a[title]').tooltip({container:'body'});

			parent.find('div.dropdown-menu').find('input')
					.on('click', function () {
						return false;
					})
					.change(function () {
						$(this).parent('div.dropdown-menu').siblings('a.dropdown-toggle').dropdown('toggle');
					})
					.keydown('esc', function () {
						this.value='';
						$(this).change();
					}
			);

			parent.find('div#editor').wysiwyg({ fileUploadError: function(reason, detail) {
				if (reason === 'unsupported-file-type') {
					msg = "Unsupported format " + detail;
				} else {
				}
				$('<div class="alert"> <button type="button" class="close" data-dismiss="alert">&times;</button>' + '<strong>File upload error</strong> ' + msg + ' </div>').prependTo('#alerts');
			}});

			self.loadWysiwygContent(parent, data);
		},

		loadWysiwygContent: function(parent, data) {
			var self = this,
				type = parent.find('div.switch-link.active').data('type');

			parent.find('div#editor').html(data[type]);
		},

		renderNewConference: function(parent) {
			var self = this;

			monster.request({
				resource: 'conferences.getPins',
				data: {
					accountId: self.accountId
				},
				success: function(data, status) {
					var conference = {
							participants: [],
							pins: {
								moderator: data.data[0],
								member: data.data[1]
							}
						},
						conferenceTemplate = $(monster.template(self, 'editConference', {conference: conference})),
						dateInputDiv = conferenceTemplate.find('.date-input-div'),
						dateInput = dateInputDiv.find('.date-input'),
						timeInput = dateInputDiv.find('.time-input');


					dateInput.datepicker({ minDate: 0 });
					dateInput.datepicker('setDate', new Date());
					timeInput.timepicker();
					timeInput.timepicker('setTime', new Date());
					dateInputDiv.hide();

					self.refreshParticipantsList(conferenceTemplate, conference.participants, true);
					self.refreshParticipantsList(conferenceTemplate, conference.participants, false);

					self.bindNewConferenceEvents( {
						parent: conferenceTemplate,
						appContainer: parent,
						conference: conference
					});


					parent.find('.right-content')
						.empty()
						.append(conferenceTemplate);
				}
			});
		},

		editConference: function(parent, conferenceId) {
			var self = this;
			monster.request({
				resource: 'conferences.get',
				data: {
					accountId: self.accountId,
					conferenceId: conferenceId
				},
				success: function(data, status) {
					var conference = data.data,
						startDate = monster.util.gregorianToDate(conference.start),
						conferenceTemplate = $(monster.template(self, 'editConference', {conference: conference})),
						dateInput = conferenceTemplate.find('.date-input'),
						timeInput = conferenceTemplate.find('.time-input');

					dateInput.datepicker({ minDate: 0 });
					dateInput.datepicker('setDate', startDate);
					timeInput.timepicker();
					timeInput.timepicker('setTime', startDate);

					self.refreshParticipantsList(conferenceTemplate, conference.participants, true);
					self.refreshParticipantsList(conferenceTemplate, conference.participants, false);

					self.bindNewConferenceEvents( {
						parent: conferenceTemplate,
						appContainer: parent,
						conference: conference
					});

					parent.find('.right-content')
						.empty()
						.append(conferenceTemplate);
				}
			});
		},

		refreshParticipantsList: function(parent, participants, isModerator) {
			var self = this,
				type = isModerator ? 'moderator' : 'member',
				params = {
					participants: $.map(participants, function(v) {
						return v.moderator === isModerator ? v : null;
					}),
					moderator: isModerator
				},
				template = $(monster.template(self, 'participantsList', params));

			parent.find('.participant-list-container[data-type="'+type+'"]')
				.empty()
				.append(template);
		},

		/* Expected params:
			parent,
			appContainer,
			conference
		*/
		bindNewConferenceEvents: function(params) {
			var self = this,
				parent = params.parent,
				appContainer = params.appContainer,
				conference = params.conference,
				switchLinks = parent.find('.switch-link'),
				containsEmail = function(email, participants) {
					var result = false;
					$.each(participants, function(k, v) {
						if(v.email === email) {
							result = true;
							return false;
						}
					});
					return result;
				};

			conference.participants = conference.participants || [];

			switchLinks.on('click', function() {
				var $this = $(this);
				if(!$this.hasClass('active')) {
					switchLinks.removeClass('active');
					$this.addClass('active');
					if($this.data('start') === 'now') {
						parent.find('.date-input-div').slideUp();
					} else {
						parent.find('.date-input-div').slideDown();
					}
				}
			});

			parent.find('.participant-list-container').on('click', '.add-participant-link > a', function(e) {
				e.preventDefault();

				self.showAddParticipantPopup(
					function(participant) {
						if(!containsEmail(participant.email, conference.participants)) {
							conference.participants.push(participant);
							self.refreshParticipantsList(parent, conference.participants, participant.moderator);
						} else {
							self.conferenceAlert(self.i18n.active().popupMessages.participantEmailDuplicateAlert);
						}
					},
					function() {},
					$(this).parent().data('type')
				);
			});

			parent.find('.participant-list-container').on('click', '.remove-participant-link', function(e) {
				var $this = $(this),
					email = $this.data('email');

				$.each(conference.participants, function(key, val) {
					if(val.email === email) {
						conference.participants.splice(key, 1);
						self.refreshParticipantsList(parent, conference.participants, val.moderator);
						return false;
					}
				});
			});

			parent.find('#create_conference_btn').on('click', function(e) {
				e.preventDefault();
				var formData = form2object('edit_conference_container'),
					newConference;
				delete formData.extra;
				newConference = $.extend(true, {}, conference, formData);

				if(!newConference.name) {
					self.conferenceAlert(self.i18n.active().popupMessages.mandatoryConferenceNameAlert);
				} else {
					if(parent.find('.switch-link.active').data() === 'now') {
						newConference.start = monster.util.dateToGregorian(new Date());
					} else {
						function createConference() {
							var date = parent.find('.date-input').datepicker('getDate'),
								time = parent.find('.time-input').timepicker('getTime');

							date.setHours(time.getHours());
							date.setMinutes(time.getMinutes());
							newConference.start = monster.util.dateToGregorian(date);

							monster.request({
								resource: 'conferences.add',
								data: {
									accountId: self.accountId,
									data: newConference
								},
								success: function(data, status) {
									var currentTimestamp = monster.util.dateToGregorian(new Date());
									toastr.success(self.i18n.active().toastrMessages.newConferenceSuccess);

									appContainer.find('.left-menu .nav-item').removeClass('active');
									if(newConference.start > currentTimestamp) {
										self.renderUpcomingConferences(appContainer);
										appContainer.find('#upcoming_conferences').addClass('active');
									} else {
										self.renderActiveConference(appContainer);
										appContainer.find('#active_conferences').addClass('active');
									}
								},
								error: function(data, status) {
									toastr.error(self.i18n.active().toastrMessages.newConferenceError);
								}
							});
						};

						if(newConference.participants.length <= 0) {
							self.conferenceConfirm(self.i18n.active().popupMessages.noParticipantConfirm, function() {
									createConference();
							});
						} else {
							createConference();
						}
					}
				}
			});

			parent.find('#update_conference_btn').on('click', function(e) {
				e.preventDefault();
				var formData = form2object('edit_conference_container'),
					newConference;
				delete formData.extra;
				newConference = $.extend(true, {}, conference, formData);

				if(!newConference.name) {
					self.conferenceAlert(self.i18n.active().popupMessages.mandatoryConferenceNameAlert);
				} else {
					if(parent.find('.switch-link.active').data() === 'now') {
						newConference.start = monster.util.dateToGregorian(new Date());
					} else {
						function updateConference() {
							var date = parent.find('.date-input').datepicker('getDate'),
								time = parent.find('.time-input').timepicker('getTime');

							date.setHours(time.getHours());
							date.setMinutes(time.getMinutes());
							newConference.start = monster.util.dateToGregorian(date);

							monster.request({
								resource: 'conferences.update',
								data: {
									accountId: self.accountId,
									conferenceId: newConference.id,
									data: newConference
								},
								success: function(data, status) {
									var currentTimestamp = monster.util.dateToGregorian(new Date());
									toastr.success(self.i18n.active().toastrMessages.updateConferenceSuccess);

									appContainer.find('.left-menu .nav-item').removeClass('active');
									if(newConference.start > currentTimestamp) {
										self.renderUpcomingConferences(appContainer);
										appContainer.find('#upcoming_conferences').addClass('active');
									} else {
										self.renderActiveConference(appContainer);
										appContainer.find('#active_conferences').addClass('active');
									}
								},
								error: function(data, status) {
									toastr.error(self.i18n.active().toastrMessages.updateConferenceError);
								}
							});
						};

						if(newConference.participants.length <= 0) {
							self.conferenceConfirm(self.i18n.active().popupMessages.noParticipantConfirm, function() {
								updateConference();
							});
						} else {
							updateConference();
						}
					}
				}
			});

			parent.find('#cancel_conference_btn').on('click', function(e) {
				e.preventDefault();
				self.conferenceConfirm(self.i18n.active().popupMessages.deleteConferenceConfirm, function() {
					monster.request({
						resource: 'conferences.delete',
						data: {
							accountId: self.accountId,
							conferenceId: conference.id,
							data: {}
						},
						success: function(data, status) {
							toastr.success(self.i18n.active().toastrMessages.deleteConferenceSuccess);
							self.renderUpcomingConferences(appContainer);
						},
						error: function(data, status) {
							toastr.error(self.i18n.active().toastrMessages.deleteConferenceError);
						}
					});
				});
			});

			parent.find('#back_to_conferences_link').on('click', function(e) {
				e.preventDefault();
				self.renderUpcomingConferences(appContainer);
			});
		},

		showAddParticipantPopup: function(callbackOk, callbackCancel, participantType) {
			var self = this,
				dialog,
				template = $(monster.template(self, 'addParticipantPopup', { type: participantType })),
				options = {
					closeOnEscape: true,
					dialogClass: "conference-dialog",
					dialogType: "conference",
					onClose: function() {
						ok ? callbackOk && callbackOk(participant) : callbackCancel && callbackCancel();
					}
				},
				ok = false,
				participant = {};

			options.title = '<i class="icon-telicon-add-user icon-large adduser-user-icon"></i>';

			if(!participantType) {
				options.title += self.i18n.active().popupTitles.participant;
			} else if(participantType === "member") {
				options.title += self.i18n.active().popupTitles.member;
			} else if(participantType === "moderator") {
				options.title += self.i18n.active().popupTitles.moderator;
			}

			dialog = monster.ui.dialog(template, options);

			template.find('#add_participant_btn').on('click', function(e) {
				e.preventDefault();
				participant = form2object('add_new_participant_form');
				participant.moderator = (template.find('input:radio[name="moderator"]:checked').val() === 'true');

				if(!participant.email) {
					self.conferenceAlert(self.i18n.active().popupMessages.mandatoryParticipantEmailAlert);
				} else {
					ok = true;
					dialog.dialog('close');
				}
			});

			return dialog;
		},

		renderViewConference: function(conferenceId) {
			var self = this,
				parent = $('#conferences_container'),
				renderView = function() {
					var defaults = {
					};

					monster.parallel({

						status: function(callback) {
							monster.request({
								resource: 'conferences.view',
								data: {
									accountId: self.accountId,
									conferenceId: conferenceId
								},
								success: function(data) {
									callback(null, data.data);
								}
							});
						},
						conference: function(callback) {
							monster.request({
								resource: 'conferences.get',
								data: {
									accountId: self.accountId,
									conferenceId: conferenceId
								},
								success: function(data) {
									callback(null, data.data);
								}
							});
						}
					},
					function(err, results, i1, i2) {
						var dataTemplate = self.formatViewConference(results),
							template = 'userType' in self ? 'viewUserConference' : 'viewConference';
							conferenceView = $(monster.template(self, template, dataTemplate));

						_.each(dataTemplate.users, function(user) {
							conferenceView
								.find('div.content')
								.append(monster.template(self, 'boxUser', user));
						});

						parent
							.find('#conference_viewer')
							.empty()
							.append(conferenceView);

						self.bindViewConference(parent, dataTemplate);

						parent
							.find('div.menu')
							.hide();

						parent
							.find('div#conference_viewer')
							.fadeIn('slow');
					});
				};

			monster.socket.removeAllListeners();
			monster.socket.emit('connection_status');

			monster.socket.on('connection_status', function(isConnected) {
				if(!isConnected) {
					monster.socket.emit('connection', {'conference_id': conferenceId, 'user_name': self.userId});

					monster.socket.on('connected', function() {
						renderView();
					});
				}
				else {
					renderView();
				}
			});
		},

		formatUserViewConference: function(user) {
			var self = this,
				//randomImages = [ 'jean', 'james', 'karl', 'peter', 'darren', 'dhruvi', 'patrick', 'xavier' ];
				randomImages = [ 'meme21', 'meme22', 'meme23', 'meme24', 'meme25', 'meme26', 'meme27', 'meme28', 'meme29', 'meme30', 'meme31', 'meme32', 'meme33', 'meme34', 'meme36'],
				formattedUser = {
					id: user.call_id,
					isDeaf: ( user.hear ) ? false : true,
					isAdmin: user.is_moderator,
					isMuted: user.mute,
					isAbsent: ( user.call_id ) ? false : true,
					isSpeaking: user.talking,
					name: user.caller_id_name,
					hasRights: 'userType' in self ? self.userType === 'unregistered' && self.isModerator : true,
					pin: user.pin
				};

			if ( typeof formattedUser.id === 'undefined' ) {
				formattedUser.name = user.name;
				formattedUser.isAdmin = user.moderator;
			}

			var a = formattedUser.name.charCodeAt(0),
				b = formattedUser.name.charCodeAt(formattedUser.name.length -1);

			formattedUser.imageRef = randomImages[(a+b) % randomImages.length];

			return formattedUser;
		},

		formatViewConference: function(data) {
			var self = this,
				formattedData = $.extend(true, data.conference, {
					users: []
				});

			formattedData.elapsedTime = monster.util.friendlyTimer(data.status.run_time);
			formattedData.rawElapsedTime = data.status.run_time;

			if('userType' in self && self.userType === 'unregistered') {
				formattedData.user = self.user;
			}

			_.each(data.conference.participants, function (user) {
				formattedData.users.push(self.formatUserViewConference(user));
			});

			// _.each(data.status.participants, function (user) {
			// 	formattedData.users.push(self.formatUserViewConference(user));
			// });

			formattedData.users.sort(function (a, b) {
				return ( a.isAbsent ) ? (a.isAdmin === ( false ) ? -1 : 1) : (a.isAdmin === ( false ) ? 1 : -1);
			});

			formattedData.users.sort(function(a, b) {
				return a.isAbsent === ( false ) ? -1 : 1;
			});

			return formattedData;
		},

		/* Expected Args:
			action,
			conferenceId,
			participantId,
			successCallback
		*/
		actionUser: function(args) {
			var self = this;

			monster.request({
				resource: 'conferences.' + args.action + 'Participant',
				data: {
					conferenceId: args.conferenceId,
					accountId: self.accountId,
					participantId: args.participantId,
					data: {}
				},
				success: function(data) {
					args.success && args.success(data);
				}
			});
		},

		/* Expected Args:
			accountId,
			conferenceId,
			action,
			successCallback
		*/
		actionConference: function(args) {
			var self = this;

			monster.request({
				resource: 'conferences.actionConference',
				data: {
					accountId: self.accountId,
					conferenceId: args.conferenceId,
					action: args.action,
					data: {}
				},
				success: function(data) {
					args.success && args.success(data);
				}
			});
		},

		bindViewConference: function(parent, data) {
			var self = this,
				styles = [ 'style1', 'style2', 'style3' ],
				time = data.rawElapsedTime,
				target,
				interval = setInterval(function() {
					target = parent.find('.timerjs');

					time++;

					/* As long as the page is displayed */
					if(parent.find('.info:visible').size() > 0) {
						target.html(monster.util.friendlyTimer(time));
					}
					else {
						clearInterval(interval);
					}
				}, 1000);

			parent.find('[data-toggle="tooltip"]').tooltip();

			/* Prevent bug on iPad for tooltips */
			parent.find('[data-toggle="tooltip"]').on('show', function (e) {
				if ('ontouchstart' in document.documentElement) e.preventDefault()
			});

			parent.find('.action-conference[data-action="add-user"]').on('click', function() {
				self.showAddParticipantPopup(function(participant) {
					monster.request({
						resource: 'conferences.addParticipant',
						data: {
							conferenceId: data.id,
							accountId: self.accountId,
							data: participant
						},
						success: function(user) {

							var dataUser = self.formatUserViewConference(user.data),
								userTemplate = $(monster.template(self, 'boxUser', dataUser)).fadeIn('slow');

							var admins = [];
							for (var key in data.users) {
								if ( data.users[key].isAdmin ) {
									admins.push(data.users[key].pin);
								}
							}

							if ( dataUser.isAdmin && dataUser.isAbsent ) {
								userTemplate.insertAfter(parent.find('div.content').find('div.user.absent[data-pin="' + admins[admins.length - 1] + '"]'));
							} else if ( !dataUser.isAdmin && dataUser.isAbsent ) {
								parent
									.find('div#view_conference')
									.find('div.content')
									.append(userTemplate);
							}
						}
					});
				});
			});

			parent.find('div.action-conference.api').on('click', function () {
				var actionBox = $(this),
					action = ( actionBox.data('action') == 'record' ) ? 'start_record' : actionBox.data('action');

				if (actionBox.hasClass('active')) {
					actionBox.removeClass('active');

					switch (action) {
						case 'start_record':
							action = 'stop_record';
							break;
						case 'mute':
							action = 'unmute';
							break;
						case 'lock':
							action = 'unlock';
							break;
					}
				} else {
					actionBox.addClass('active');
				};

				var args = {
						action: action,
						conferenceId: data.id,
						userId: self.accountId,
						success: function (data) {}
					};

				self.actionConference(args);
			});

			var quitConferenceViewer = function() {
				monster.socket.emit('disconnection');
				monster.socket.removeAllListeners();
				parent.off('click', '.action-user');

				parent
					.find('#conference_viewer')
					.hide();

				parent
					.find('.menu')
					.fadeIn('slow');

				parent
					.find('#conference_viewer')
					.hide();
			};

			parent.find('.action-conference[data-action="hangup"]').on('click', function() {
				quitConferenceViewer();
			});

			parent.find('.action-conference[data-action="logout"]').on('click', function() {
				self.conferenceConfirm(self.i18n.active().popupMessages.confirmLogout, function() {
					window.location.reload();
				});
			});

			parent.find('div.action-user').on('click', function() {
				var actionBox = $(this),
					prefix = actionBox.hasClass('active') ? 'un' : '',
					action = prefix + actionBox.data('action'),
					participantId = actionBox.parents('.user').data('id'),
					conferenceId = data.id;

				self.actionUser({
					action: action,
					participantId: participantId,
					conferenceId: conferenceId
				});
			});

			var ifStillUsingConference = function(callback) {
				if(parent.find('#view_conference:visible').size() === 0) {
					monster.socket.emit('disconnection');
					monster.socket.removeAllListeners();

					parent.find('.action-user').off('click');
				}
				else {
					callback();
				}
			};

			// monster.socket.on('user_connected', function () {
			// 	ifStillUsingConference(function () {});
			// });

			// monster.socket.on('user_disconnected', function () {
			// 	ifStillUsingConference(function () {});
			// });

			monster.socket.on('add_member', function(userId, userInfo) {
				ifStillUsingConference(function() {
					var dataTemplate = self.formatUserViewConference(userInfo),
						contentDiv = parent.find('div#view_conference').find('div.content'),
						userDiv = contentDiv.find('div.user[data-pin="' + userInfo.pin +'"]'),
						isAdmin = ( typeof userDiv.data('admin') === 'undefined' ) ? false : true;

					dataTemplate.isAdmin = isAdmin;

					for (var key in data.participants) {
						if ( data.participants[key].pin == userInfo.pin ) {
							dataTemplate.name = data.participants[key].name;
						}
					}

					userDiv.remove();

					if ( isAdmin ) {
						contentDiv.prepend(monster.template(self, 'boxUser', dataTemplate));
					} else {
						$(monster.template(self, 'boxUser', dataTemplate)).insertAfter(contentDiv.find('div.user[data-admin]').last());
					}
				});
			});

			monster.socket.on('del_member', function(userId, userInfo) {

				ifStillUsingConference(function() {
					var dataTemplate = self.formatUserViewConference(userInfo),
						contentDiv = parent.find('div#view_conference').find('div.content'),
						userPin = parent.find('div.user[data-id="' + userId + '"]').data('pin'),
						userDiv = parent.find('div.user[data-pin="' + userPin + '"]'),
						isAdmin = ( typeof userDiv.data('admin') === 'undefined' ) ? false : true;

					dataTemplate.isAdmin = isAdmin;
					dataTemplate.pin = userPin;
					dataTemplate.isAbsent = true;
					dataTemplate.id = userId;

					for (var key in data.participants) {
						if ( data.participants[key].pin == userPin ) {
							dataTemplate.name = data.participants[key].name;
						}
					}

					userDiv.remove();

					if ( isAdmin ) {
						$(monster.template(self, 'boxUser', dataTemplate)).insertAfter(contentDiv.find('div.user.absent[data-admin]').last());
					} else {
						contentDiv.append(monster.template(self, 'boxUser', dataTemplate));
					}

					for(style in styles) {
						userDiv
							.find('div.currently-speaking')
							.removeClass(styles[style]);
					}
				});
			});

			monster.socket.on('conference_destroy', function(conferenceId) {
				if(data.id === conferenceId) {
					toastr.warning(self.i18n.active().toastrMessages.almostDoneConference);

					setTimeout(function() {
						toastr.success(self.i18n.active().toastrMessages.destroyedConference);

						quitConferenceViewer();
					}, 5000);
				}
			});

			monster.socket.on('lock_true', function(data) {
				parent
					.find('div.action-conference.api[data-action="lock"]')
					.addClass('active');
			});

			monster.socket.on('lock_false', function(data) {
				parent
					.find('div.action-conference.api[data-action="lock"]')
					.removeClass('active');
			});

			monster.socket.on('record_true', function(data) {
				parent
					.find('div.action-conference.api[data-action="record"]')
					.addClass('active');
			});

			monster.socket.on('record_false', function(data) {
				parent
					.find('div.action-conference.api[data-action="record"]')
					.removeClass('active');
			});

			monster.socket.on('mute_member', function(user, data) {
				ifStillUsingConference(function() {
					var current = parent.find('div.user[data-id="'+ user + '"]').find('div.currently-speaking');

					parent
						.find('div.user[data-id="'+ user + '"]')
						.find('div.action-user[data-action="mute"]')
						.addClass('active');

					parent
						.find('div.user[data-id="' + user + '"]')
						.find('div.state-user')
						.find('i:last-child')
						.addClass('active');

					current.removeClass('active');

					for(style in styles) {
						current.removeClass(styles[style]);
					}
				});
			});

			monster.socket.on('unmute_member', function(user) {
				ifStillUsingConference(function() {
					parent
						.find('div.user[data-id="'+ user + '"]')
						.find('div.action-user[data-action="mute"]')
						.removeClass('active');

					parent
						.find('div.user[data-id="' + user + '"]')
						.find('div.state-user')
						.find('i:last-child')
						.removeClass('active');
				});
			});

			monster.socket.on('deaf_member', function(user, data) {
				ifStillUsingConference(function() {
					parent
						.find('div.user[data-id="'+ user + '"]')
						.find('div[data-action="deaf"]')
						.addClass('active');

					parent
						.find('div.user[data-id="' + user + '"]')
						.find('div.state-user')
						.find('i:first-child')
						.addClass('active');
				});
			});

			monster.socket.on('undeaf_member', function(user, data) {
				ifStillUsingConference(function() {
					parent
						.find('div.user[data-id="'+ user + '"]')
						.find('div[data-action="deaf"]')
						.removeClass('active');

					parent
						.find('div.user[data-id="' + user + '"]')
						.find('div.state-user')
						.find('i:first-child')
						.removeClass('active');
				});
			});

			monster.socket.on('start_talking', function(user, data) {
				ifStillUsingConference(function() {
					var styleClass = styles[(Math.floor(Math.random() * 100) % 3)];

					parent
						.find('div.user[data-id="'+ user + '"]')
						.find('div.currently-speaking')
						.addClass('active ' + styleClass);
				});
			});

			monster.socket.on('stop_talking', function(user, data) {
				ifStillUsingConference(function() {
					parent
						.find('div.user[data-id="'+ user + '"]')
						.find('div.currently-speaking')
						.removeClass('active');

					for(style in styles) {
						parent
							.find('div.user[data-id="'+ user + '"]')
							.find('div.currently-speaking')
							.removeClass(styles[style]);
					}
				});
			});
		},

		conferenceAlert: function(type, content, callback) {
			return monster.ui.alert(type, content, callback, { dialogClass: "conference-dialog", dialogType: "conference" });
		},

		conferenceConfirm: function(content, callbackOk, callbackCancel) {
			var dialog = monster.ui.confirm(content, callbackOk, callbackCancel, { dialogClass: "conference-dialog", dialogType: "conference" });
			dialog.find('.btn').removeClass('btn').addClass('conf-btn');
			dialog.find('.btn-danger').removeClass('btn-danger');
			dialog.find('.btn-success').removeClass('btn-success').addClass('blue-btn');
			return dialog;
		}
	};

	return app;
});

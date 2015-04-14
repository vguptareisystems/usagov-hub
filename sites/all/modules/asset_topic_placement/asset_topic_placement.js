
// On document ready, we may need to initialize this helper script
jQuery(document).ready( function () {

	if ( typeof jQuery.fn.waitUntilExists != 'function' ) {
		alert('Error - Missing waitUntilExists jQuery library!');
		return;
	}

	/*Every so often, check if we need to initialize this helper script [again]
	This is necessary because a single term's edit form can be loaded on a 
	single page multiple times in the "Taxonomy Manager" */
	setInterval(function () {
		
		// If there is a term's edit form on this page, and this help script has NOT been applied to it...
		if ( jQuery('.group-asset-topic-placement').length > 0 && jQuery('.group-asset-topic-placement.helper-script-applied').length == 0 ) {

			console.log('Firing initAssetTopicPlacementHelperScript()');
			initAssetTopicPlacementHelperScript();

			// Note this helper-script has been applied to this form
			jQuery('.group-asset-topic-placement').addClass('helper-script-applied');
		}

		// Bug killer - Sometimes multiple "Show/Hide row weights" links show...
		jQuery('.field-type-entityreference').each( function () {
			var jqThis = jQuery(this);
			var toggleWeights = jqThis.find('a.tabledrag-toggle-weight');
			if ( toggleWeights.length > 1 ) {
				toggleWeights.hide();
				toggleWeights.last().show();
			}
		});

	}, 100);

});

function initAssetTopicPlacementHelperScript() {

	updateAssetTopicPlacementCountClasses();

	// When the user touches a checkbox under the "Asset Topic Taxonomy" field... 
	jQuery('.field-name-field-asset-topic-taxonomy input').bind('click', function () {
		
		// I'm using setTimeout() to make [very] sure that this event fires AFTER the browser has handled the checkbox ticked-value alteration...
		setTimeout( function (tThis) {

			if ( tThis.checked ) {
				if ( jQuery('.group-asset-topic-placement').queue('fx').length < 3 ) {
					jQuery('.group-asset-topic-placement').queue( function () {

						jQuery('.group-asset-topic-placement').fadeIn();

						var addTids = [];
						jQuery('.field-name-field-asset-topic-taxonomy input:checked').each( function () {
							addTids.push(this.value);
						});

						alterTermsInAssetPlacementFields(function () {
							updateAssetTopicPlacementCountClasses();
							jQuery('.group-asset-topic-placement').dequeue();
						});
					});
				}
			} else {
				jQuery('.group-asset-topic-placement').queue( function () {
					jQuery('.group-asset-topic-placement input[value=' + tThis.value + ']').parents('tr').remove();
					updateAssetTopicPlacementCountClasses();
					jQuery('.group-asset-topic-placement').dequeue();
				});
			}

		}, 10, this);

	});

	// When the user touches a checkbox under the "Also include on Nav Pages" field... 
	jQuery('.field-name-field-also-include-on-nav-page input').bind('click', function () {

		// I'm using setTimeout() to make [very] sure that this event fires AFTER the browser has handled the checkbox ticked-value alteration...
		setTimeout( function (tThis) {

			if ( tThis.checked ) {
				jQuery('.group-asset-topic-placement').fadeIn();
				var targId = jQuery('.field-name-field-asset-order-menu').attr('id');
				injectRowIntoAssetPlacementField('#'+targId, tThis.value, jQuery(tThis).parent().find('label').text());
			} else {
				jQuery('.field-name-field-asset-order-menu input[value=' + tThis.value + ']').parents('tr').remove();
				updateAssetTopicPlacementCountClasses();
			}

		}, 10, this);
	});

	// When the user clicks an "Inherit" checkbox...
	jQuery('.group-asset-topic-placement input[name*="inherit"]').bind('click', function () {
		// I'm using setTimeout() to make [very] sure that this event fires AFTER the browser has handled the checkbox ticked-value alteration...
		setTimeout( function () {
			enforceAssetTopicOrderVisibilityBasedOnInheritance();
		}, 10);
	});

	/* When the page first loads, we want to make sure any [currently] selected term under 
	"Asset Topic Taxonomy" shows under ALL lists in "Asset Topic Placement" (this is necessary 
	on taxonomy edit-pages) */
	var tickedCheckboxes = jQuery('.field-name-field-asset-topic-taxonomy input:checked');
	if ( tickedCheckboxes.length > 0 ) {
		var selectedTermIDs = [];
		tickedCheckboxes.each( function () {
			selectedTermIDs.push( this.value );
		});
		alterTermsInAssetPlacementFields(function () {
			updateAssetTopicPlacementCountClasses();
		});
	}

	/* When the page first loads, we want to make sure any [currently] selected term under 
	"Also include on Nav Pages" shows under the lists in "Menu Region" (this is necessary 
	on taxonomy edit-pages) */
	var tickedCheckboxes = jQuery('.field-name-field-also-include-on-nav-page input:checked');
	if ( tickedCheckboxes.length > 0 ) {
		tickedCheckboxes.each( function () {
			var targId = jQuery('.field-name-field-asset-order-menu').attr('id');
			injectRowIntoAssetPlacementField('#'+targId, this.value, jQuery(this).parent().find('label').text());
		});
	}	

}

/* Shows or hides each "Asset Topic Order" field based on weather to not 
 * the "Inherit this region's assets from parent" sibling-checkbox is ticked.
 */
function enforceAssetTopicOrderVisibilityBasedOnInheritance() {

	
	jQuery('.group-asset-topic-placement .form-item.form-type-checkbox label:contains("Inherit")').each( function () {
		var jqThis = jQuery(this);
		var inheritCheckbox = jqThis.siblings('input');
		var fieldsetContainer = jqThis.parents('.fieldset-wrapper').eq(0); // Search up the DOM from $(this) to the first div.fieldset-wrapper
		var assetTopicOrderField = fieldsetContainer.children('.field-widget-entityreference-view-widget');

		if ( inheritCheckbox.attr('checked') ) {
			assetTopicOrderField.fadeOut();
		} else {
			assetTopicOrderField.fadeIn();
		}
	});

}

function updateAssetTopicPlacementCountClasses() {

	// These classes are used for theming purposes in asset_topic_placement.css
	if ( jQuery('.field-name-field-asset-topic-taxonomy input:checked').length > 0 ) {
		jQuery('.group-asset-topic-placement').removeClass('term-count-0');
		jQuery('.group-asset-topic-placement').addClass('term-count-not-0');
	} else {
		jQuery('.group-asset-topic-placement').addClass('term-count-0');
		jQuery('.group-asset-topic-placement').removeClass('term-count-not-0');
	}

}

function alterTermsInAssetPlacementFields(callback) {

	jQuery('.group-asset-topic-placement').addClass('term-processing'); // This shows a spinner
	jQuery('.group-homepage-container').addClass('term-processing'); // This shows a spinner

	var targId = jQuery('.field-name-field-asset-order-carousel').attr('id');
	alterTermsInAssetPlacementField('#'+targId, function () {

		var targId = jQuery('.field-name-field-asset-order-content').attr('id');
		alterTermsInAssetPlacementField('#'+targId, function () {

			var targId = jQuery('.field-name-field-asset-order-sidebar').attr('id');
			alterTermsInAssetPlacementField('#'+targId, function () {

				var targId = jQuery('.field-name-field-asset-order-bottom').attr('id');
				alterTermsInAssetPlacementField('#'+targId, function () {

					var targId = jQuery('.field-name-field-home-alert-asset').attr('id');
					alterTermsInAssetPlacementField('#'+targId, function () {

						var targId = jQuery('.field-name-field-home-quote1-asset').attr('id');
						alterTermsInAssetPlacementField('#'+targId, function () {

							var targId = jQuery('.field-name-field-home-popular-asset').attr('id');
							alterTermsInAssetPlacementField('#'+targId, function () {

								var targId = jQuery('.field-name-field-home-quote2-asset').attr('id');
								alterTermsInAssetPlacementField('#'+targId, function () {

									var targId = jQuery('.field-name-field-home-quote3-asset').attr('id');
									alterTermsInAssetPlacementField('#'+targId, function () {

										var targId = jQuery('.field-name-field-home-cat2cont-assets').attr('id');
										alterTermsInAssetPlacementField('#'+targId, function () {

											var targId = jQuery('.field-name-field-home-quickfindcont-asset').attr('id');
											alterTermsInAssetPlacementField('#'+targId, function () {

												reinitializeDragTables();
												jQuery('.group-asset-topic-placement').removeClass('term-processing'); // This removes the spinner
												jQuery('.group-homepage-container').removeClass('term-processing'); // This removes the spinner

												// Trigger callback
												if ( typeof callback === 'function' ) {
													callback();
												}
												
											})
										})
									})
								})
							})
						})
					})
				})
			})
		})
	});
}

function alterTermsInAssetPlacementField(fieldSelector, callback) {

	console.log('Now applying changes to the Asset-Topic-Placement-Field: ' + fieldSelector);

	// Initalize NodeUnderTopicCache
	if ( typeof NodeUnderTopicCache === 'undefined' ) {
		NodeUnderTopicCache = {};
	}

	// Get selected Asset-Topic Taxonomy terms
	var terms = [];
	jQuery('.field-name-field-asset-topic-taxonomy input:checked').each( function () {
		terms.push(this.value);
	});
	var nutCacheKey = 't' + terms.join('t', terms);

	// Get nodes associated to these Asset-Topic taxonomy terms...
	if ( typeof NodeUnderTopicCache[nutCacheKey] !== 'undefined' ) {
		alterTermsInAssetPlacementField_callInjectRows(fieldSelector, NodeUnderTopicCache[nutCacheKey], callback);
	} else {
		jQuery.get('/atm/get-nodes-under-topics?terms='+terms.join(','), function (nodes) {
			NodeUnderTopicCache[nutCacheKey] = nodes;
			alterTermsInAssetPlacementField_callInjectRows(fieldSelector, nodes, callback);
		});
	}

}

function alterTermsInAssetPlacementField_callInjectRows(fieldSelector, nodes, callback) {

	for ( var x = 0 ; x < nodes.length ; x++ ) {
		injectRowIntoAssetPlacementField(fieldSelector, nodes[x].nid, nodes[x].title);
	}

	if ( typeof callback == 'function' ) {
		callback();
	}
}

function injectRowIntoAssetPlacementField(fieldSelector, nodeId, nodeTitle) {

	// if this table already has this entity-reference, then bail
	if ( jQuery(fieldSelector+' input[value='+nodeId+']').length > 0 ) {
		return;
	}

	var newRowHTML = '<tr class="draggable ODD_OR_EVEN">\
		<td class="field-multiple-drag">\
			<a href="#" class="tabledrag-handle" title="Drag to re-order">\
				<div class="handle">&nbsp;</div>\
			</a>\
		</td>\
		<td colspan=1>\
			<div class="form-item form-type-checkbox form-item-FIELD_HERE-und-VALUE_ID_HERE-target-id">\
	 			<input id="edit-FIELD_HERE-und-VALUE_ID_HERE" data-delta="VALUE_ID_HERE" type="checkbox" name="FIELD_UNDER_NAME[und][VALUE_ID_HERE][target_id]" value="NODE_ID_HERE" class="form-checkbox">\
	 			<span class="field-suffix">\
	 				<label class="option" for="edit-FIELD_HERE-und-VALUE_ID_HERE">NODE_TITLE_HERE</label>\
	 			</span>\
			</div>\
		</td>\
		<td colspan=1 class="delta-order tabledrag-hide" style="display: none;">\
			<div class="form-item form-type-select form-item-FIELD_HERE-und-VALUE_ID_HERE--weight">\
	  			<label class="element-invisible">Weight </label>\
			 	<select id="edit-FIELD_HERE-und-VALUE_ID_HERE-weight" class="must-set-val weight-select FIELD_HERE-delta-order form-select" name="FIELD_UNDER_NAME[und][VALUE_ID_HERE][_weight]">\
			 		<option value="-1">-1</option>\
			 		<option value="0">0</option>\
			 		<option value="1">1</option>\
			 	</select>\
			</div>\
		</td>\
	</tr>';

	var valId = jQuery(fieldSelector+' tr.draggable').length;
	var oddOrEven = ( jQuery(fieldSelector+' tr').last().hasClass('even') ? 'odd' : 'even' );
	var fieldName = String(fieldSelector).replace('#edit-', '');
	var fieldUnderName = String(fieldName).replace(/-/g, '_');
	newRowHTML = newRowHTML.replace(/FIELD_UNDER_NAME/g, fieldUnderName);
	newRowHTML = newRowHTML.replace(/FIELD_HERE/g, fieldName);
	newRowHTML = newRowHTML.replace(/VALUE_ID_HERE/g, valId);
	newRowHTML = newRowHTML.replace(/NODE_ID_HERE/g, nodeId);
	newRowHTML = newRowHTML.replace(/NODE_TITLE_HERE/g, nodeTitle);
	newRowHTML = newRowHTML.replace(/ODD_OR_EVEN/g, oddOrEven);

	jQuery(fieldSelector+' tbody').append(newRowHTML);
	updateWeightOptionsInAssetPlacementField(fieldSelector);
	jQuery(fieldSelector+' tbody tr').last().find('.'+fieldName+'-delta-order option').last().attr('selected', 'selected');
	var setWeight = jQuery(fieldSelector+' tbody tr').last().find('.'+fieldName+'-delta-order option').last().val();
	jQuery(fieldSelector+' tbody tr').last().find('.'+fieldName+'-delta-order option').val(setWeight);
	jQuery(fieldSelector+' tbody tr .weight-select').last().attr('setValTo', setWeight);

	// Remove any "No items" message in this table
	jQuery('td:contains("No items have been added yet")').parent().remove();

	// Mark this drag-table as needing to be reinitialized
	jQuery(fieldSelector).addClass('needs-dragtable-reinit');

}

function reinitializeDragTables() {

	jQuery('.needs-dragtable-reinit').each( function () {
		
		var jqThis = jQuery(this);
		var fieldSelector = '#' + jqThis.attr('id');

		console.log('Reinitializing drag-table: '+fieldSelector);

		// Determin where the drag-table information is stored in the Drupal js-variable
		var base = fieldSelector;
		base = base.replace('#edit-', '') + '-values';
		// Bug killer for the taxonomy_manager page which may change DOM-ids of the entity-reference fields
		for ( var x = 2 ; x < 30 ; x++ ) {
			base = base.replace('--'+x+'-', '-');
		}

		// Break bindings
		jQuery(fieldSelector).html( jQuery(fieldSelector).html() )

		// Remove all drag-handles in the table
		jQuery(fieldSelector+' a.tabledrag-handle .handle').remove();

		// Remove the "Show row weights" link in this table
		jQuery(fieldSelector).parent().find('a.tabledrag-toggle-weight').remove();

		Drupal.tableDrag[base] = new Drupal.tableDrag(jQuery('#'+base).get(0), Drupal.settings.tableDrag[base]);

		// Re-initialize the Drupal.tableDrag[~]
		var dragTblObj = Drupal.tableDrag[base];
		dragTblObj.showColumns();
		jQuery(fieldSelector+' .must-set-val').each( function () {
			//alert( jQuery(fieldSelector+' tr').length - track );
			var jqThis = jQuery(this)
			jqThis.val( jqThis.attr('setValTo') );
			setTimeout( function () {
				jqThis.removeClass('must-set-val');
				dragTblObj.hideColumns();
				ensureEditAssetLinksExsist();
			}, 150);
		});
		
	});


}

function updateWeightOptionsInAssetPlacementField(fieldSelector) {

	var fieldName = String(fieldSelector).replace('#edit-', '');
	var maxWeight = jQuery(fieldSelector+' tr.draggable').length;
	jQuery(fieldSelector+' tr.draggable').each( function () {

		var weightSelect = jQuery(this).find('.'+fieldName+'-delta-order');

		for ( var w = 1 ; w < maxWeight+1 ; w++ ) {
			if ( weightSelect.find('option[value='+w+']').length == 0 ) {
				weightSelect.append('<option value="'+w+'">'+w+'</option>');
			}
		}

		for ( var w = 1 ; w < maxWeight+1 ; w++ ) {
			if ( weightSelect.find('option[value=-'+w+']').length == 0 ) {
				weightSelect.prepend('<option value="-'+w+'">-'+w+'</option>');
			}
		}

	});

}

function ensureEditAssetLinksExsist() {

	jQuery('.tabledrag-processed tr').each( function () {

		var jqRow = jQuery(this);
		if ( jqRow.find('input').length > 0 && jqRow.find('a.asset-edit-link').length == 0 ) {

			var jqInput = jqRow.find('input');
			var jqLabel = jqInput.parent().find('label');
			
			var linkHTML = '<a class="asset-edit-link" style="margin-left: 7px;" target="_blank" href="/node/-NODE-ID-/edit">Edit Asset</a>';
			linkHTML = linkHTML.replace('-NODE-ID-', jqInput.attr('value'))

			jQuery(linkHTML).insertAfter(jqLabel);
		}
	});
}
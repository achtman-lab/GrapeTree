		// replace div events
		$('#replace-div').click(function(e){
			e.stopPropagation();
		}).draggable().hide();
		$('#replace-tag').click(function (e) {
			$('#replace-div').css('opacity', 1.0).width(160);
		});
		$("#replace-confirm").click(function(e) {
			var val = $("#replace-tag").val();
			columns = grid.getColumns();
			var col = columns[grid.mouse_pos[3]].field;
			if (col == '__selected') {
				var update_selection = {};
				for (var id=grid.mouse_pos[0]; id <= grid.mouse_pos[2]; id ++) {
					d = dataView.getItem(id);
					d[col] = (val && val != 'F' && val != 'f' && val != 'false') ? true : false;
					update_selection[d.__Node] = d[col];
				}
				the_tree.force_nodes.filter(function(n) {if(update_selection[n.id] !== undefined) {n.selected=update_selection[n.id]}});
				the_tree.clearSelection(true);
				the_tree._addHalos(function(d){return d.selected},5,"red");
			} else if (col != '__Node' && col != 'ID' && col != 'id') {
				for (var id=grid.mouse_pos[0]; id <= grid.mouse_pos[2]; id ++) {
					d = dataView.getItem(id);
					d[col] = val;
				}
				the_tree.changeCategory($("#metadata-select").val());
			}
			$("#replace-div").css("opacity",0.8).width(30).hide();
			grid.invalidate();
			grid.render();
		});
		$("#replace-tag").keypress(function(e){
			if (e.which === 13) {
				$("#replace-confirm").trigger("click");
			}
		});

		// metadata div events
		$('#metadata-div').draggable({handle:$('#handler')}).resizable().resize(function(){
			var h=$('#metadata-div').height();
			$('#myGrid').css({'height':(h-40)+'px'});
			grid.resizeCanvas();
		})
		.click(function(e){
			$('#replace-div').css("opacity",0.8).width(30).hide();
			$("#context-menu").hide();
		})
		.hide();
		//.show(300);
		
		$('#metadata-close').click(function(e){
			$('#metadata-div').hide(300);
		});
		$("#metadata-filter").change(function(e) {
			if (this.checked) {
				$(".slick-headerrow").show(300);
				$("#myGrid").height($("#myGrid").height()+30);
				$("#metadata-div").height($("#metadata-div").height()+30);
			} else {
				$(".slick-headerrow").hide(300);
				$("#myGrid").height($("#myGrid").height()-30);
				$("#metadata-div").height($("#metadata-div").height()-30);
			}
		});
		$("#hypo-filter").change(function(e) {
			the_tree.refreshGraph(null, true);
			updateMetadataTable();
		});
		$("#metadata-add-icon").click(function(e){
			$("<div id ='metadata-add'></div>")
			.html("Name of The New Category:<br> <input type='text' id ='metadata-add-colname'>")
			.dialog({
					modal: true,
					buttons: {
						"Add": function() {
							name = $("#metadata-add-colname").val();
							if (name && name != "") {
								addMetadataOptions(name, name);
								updateMetadataTable();
								$(this).dialog("close");
							}
						},
						"Cancel": function() {
							$(this).dialog("close");
						},
					},
					close: function () {
						$(this).dialog('destroy').remove();
					},
				})
		});
		$("#metadata-download").click(function(e){
			var headers = [], header_map = {}, output = [];
			var curr_cols = grid.getColumns();
			for (var id in curr_cols) {
				var col = curr_cols[id];
				header_map[col.field] = headers.length;
				headers.push(col.name);
			}
			output.push(headers.join('\t'));
			data = grid.getData().getFilteredItems();
			for (var id in data) {
				var d = data[id];
				var out = []; out.length = headers.length;
				for (key in header_map) {
					out[header_map[key]] = d[key] ? d[key] : '';
				}
				output.push(out.join('\t'));
			}
			saveTextAsFile(output.join('\n'), "metadata.txt");
		});
		
		// events for grid itself
		var grid;
		var dataView = new Slick.Data.DataView();
		
		var default_columns = [
			{id: "Selected", name: "<img src='static/js/img/tick.png'>", field: "__selected", width: 20, formatter: Slick.Formatters.Checkmark, sortable: true, editor: Slick.Editors.Checkbox, prop:{category:'character', group_num:30, group_order:'occurence'}},
			{id: "index", name: "index", field: "id", width: 60, prop:{category:'numeric', group_num:30, group_order:'standard'}, cssClass:'uneditable-cell'},
			{id: "Barcode", name: "Barcode", field: "__strain_id", width: 100, cssClass: "cell-title", sortable: true, prop:{category:'character', group_num:30, group_order:'standard'}, cssClass:'uneditable-cell'},
		];
		var columns = [
			{id: "Selected", name: "<img src='static/js/img/tick.png'>", field: "__selected", width: 20, formatter: Slick.Formatters.Checkmark, sortable: true, editor: Slick.Editors.Checkbox, prop:{category:'character', group_num:30, group_order:'occurence'}},
			{id: "index", name: "index", field: "id", width: 60, prop:{category:'numeric', group_num:30, group_order:'standard'}, cssClass:'uneditable-cell'},
			{id: "Barcode", name: "Barcode", field: "__strain_id", width: 100, cssClass: "cell-title", sortable: true, prop:{category:'character', group_num:30, group_order:'standard'}, cssClass:'uneditable-cell'},
		];

		var options = {
			editable: true,
			enableAddRow: false,
			enableCellNavigation: true,
			asyncEditorLoading: false,
			autoEdit: false,
			multiColumnSort: true,
			showHeaderRow: true,
			headerRowHeight: 30,
			explicitInitialization: true,
		};
		var columnFilters = {};
		function filter(item) {
			for (var columnId in columnFilters) {
			  if (columnId !== undefined && columnFilters[columnId] !== "") {
				var c = grid.getColumns()[grid.getColumnIndex(columnId)];
				try {
					regfilter = new RegExp(columnFilters[columnId], 'i');
					var found = String(item[c.field]).match(regfilter);
					if (! found) {
						return false;
					}
				} catch(e) {
				}
			  }
			}
			return true;
		}

		source_data = [{id:0,"__strain_id":"12312", "__Node":"20", "__selected":false},{id:1,"_strain_id":"1312", "__Node":"22", "__selected":true}];
		for (var index in source_data) {
			source_data[index].id = parseInt(index)+1;
		}

		grid = new Slick.Grid("#myGrid", dataView, columns, options);
		
		dataView.onRowCountChanged.subscribe(function (e, args) {
		  grid.updateRowCount();
		  grid.render();
		});
		dataView.onRowsChanged.subscribe(function (e, args) {
		  grid.invalidateRows(args.rows);
		  grid.render();
		});
		$(grid.getHeaderRow()).delegate(":input", "change keyup", function (e, args) {
		  var columnId = $(this).data("columnId");
		  if (columnId != null) {
			columnFilters[columnId] = $.trim($(this).val());
			dataView.refresh();
		  }
		});
		grid.onHeaderRowCellRendered.subscribe(function(e, args) {
			$(args.node).empty();
			$("<input type='text'>")
			   .data("columnId", args.column.id)
			   .val(columnFilters[args.column.id])
			   .appendTo(args.node);
		});
		grid.init();

		
		dataView.beginUpdate();
		dataView.setItems(source_data);
		dataView.setFilter(filter);
		dataView.endUpdate();

		function data_reformat(data, select_moveUp) {
			if (select_moveUp === true) {
				data.sort(function(d1, d2) {
					return d1.__selected == d2.__selected ? (d1.__Node == d2.__Node ? (d1.ID < d2.ID ? -1 : 1) : (d1.__Node < d2.__Node ? -1 : 1)) : (d1.__selected < d2.__selected ? 1 : -1);
				})
			}
			for (var index in data) {
				d = data[index];
				d.id = parseInt(index) + 1;
			}
			return data;
		}
		
		grid.onSort.subscribe(function (e, args) {
		  var cols = args.sortCols;
		  data = dataView.getItems();
		  data.sort(function (dataRow1, dataRow2) {
			for (var i = 0, l = cols.length; i < l; i++) {
			  var field = cols[i].sortCol.field;
			  var prop = cols[i].sortCol.prop;
			  var sign = cols[i].sortAsc ? 1 : -1;
			  if (prop.coltype == 'numeric') {
				var value1, t1; 
				if (isNumber(dataRow1[field])) {
					value1 = parseFloat(dataRow1[field]), t1=0;
				} else {
					value1 = dataRow1[field], t1 = 1;
				}
				var value2, t2; 
				if (isNumber(dataRow2[field])) {
					value2 = parseFloat(dataRow2[field]), t2=0;
				} else {
					value2 = dataRow2[field], t2 = 1;
				}
			  } else {
				var value1 = dataRow1[field], t1=1;
				var value2 = dataRow2[field], t2=1;
			  }
			  var result = t1 == t2 ? ((value1 == value2 ? 0 : (value1 > value2 ? 1 : -1)) * sign) : (t1-t2)*sign;
			  if (result != 0) {
				return result;
			  }
			}
			return 0;
		  });
		  dataView.setItems(data_reformat(data));
		  grid.invalidate();
		  grid.render();
		});
		grid.onClick.subscribe(function(e, args) {
			var cell = grid.getCellFromEvent(e);
			if (grid.getColumns()[cell.cell].field === '__selected') {
				d = grid.getDataItem(cell.row);
				d.__selected = d.__selected ? false : true;
				the_tree.force_nodes.filter(function(n){if(n.id == d.__Node) {n.selected=d.__selected}});
				the_tree.clearSelection(true);
				the_tree._addHalos(function(d){return d.selected},5,"red");
			}
		});
		grid.mouse_pos = []; 
		grid.onCellChange.subscribe(function (e, args) {
			if (args.cell == 0) {
				var d = args.item;
				the_tree.force_nodes.filter(function(n){if(n.id == d.__Node) {n.selected=d.__selected}});
				the_tree.clearSelection(true);
				the_tree._addHalos(function(d){return d.selected},5,"red");
			} else {
				the_tree.changeCategory($("#metadata-select").val());
			}
		});
		grid.onDragEnd.subscribe(function(e, args){
			grid.mouse_pos = [0, 0, e.clientX, e.clientY];
		});
		grid.setSelectionModel(new Slick.CellSelectionModel());
		grid.selectionmodel = grid.getSelectionModel();
		grid.selectionmodel.onSelectedRangesChanged.subscribe(function(e,args){
			if (args[0].fromCell != args[0].toCell) {
				return;
			} else if (args[0].fromRow === args[0].toRow) {
				return;
			}

			var xx = grid.mouse_pos[2], yy = grid.mouse_pos[3];
			grid.mouse_pos = [args[0].fromRow, args[0].fromCell, args[0].toRow, args[0].toCell];
			$("#replace-div").toggle(150).css("top",yy).css("left",xx).css("position","fixed").show();
		});
	
	function resetGridColumns() {
		grid.setColumns(default_columns);
	};

	function updateMetadataTable(select_moveUp) {
		if (! the_tree) {
			return;
		}
		var cols = {};
		for (var field in metadata_options) {
			cols[field] = metadata_options[field];
		}
		
		curr_cols = grid.getColumns();
		for (var id in curr_cols) {
			delete cols[curr_cols[id].field]
		}
		for (var c in cols) {
			if (c != "nothing") {
				if (! the_tree.metadata_info[cols[c]]) {
					the_tree.metadata_info[cols[c]] = {coltype : 'character', grouptype : 'size', colorscheme : 'category'};
				}
				curr_cols.push({id: cols[c],
					name: cols[c], 
					field: c, 
					width:120, 
					editor: Slick.Editors.Text, 
					sortable: true, 
					prop: the_tree.metadata_info[cols[c]]
				});
			}
		}

		grid.setColumns(curr_cols);

		source_data.length = 0;
		for (var id in the_tree.metadata) {
			var d = the_tree.metadata[id];
			if (the_tree.node_map[d.__Node] && (!the_tree.node_map[d.__Node].hypothetical || $('#hypo-filter').is(':checked') )) {
				d.__selected = the_tree.node_map[d.__Node].selected;
				source_data.push(d);
			}
		}
		data_reformat(source_data, select_moveUp);
		dataView.setItems(source_data);
		grid.invalidate();
		grid.render();
		$(".slick-headerrow-column").attr("title", "Type in to filter records on the columns").on('mouseenter', function(e){
			showToolTip($(this).attr('title'), {pageX:$(this).offset().left + $(this).width() + 10, pageY:$(this).offset().top + $(this).height()/2+10});
		}).on('mouseleave', function(e) {
			setTimeout(hideToolTip, 200);
		});
	};

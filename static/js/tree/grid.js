
D3MSMetadataTable.prototype= Object.create(null);
D3MSMetadataTable.prototype.constructor=D3MSMetadataTable;
		
function  D3MSMetadataTable(tree,context_menu){
	// events for grid itself
	var self = this;
	this.context_menu = context_menu;
	this.tree = tree;
	tree.addNodesSelectedListener(function(){
		self.updateMetadataTable(true);
	});
	tree.addTreeChangedListener(function(type){
		if (type === 'metadata_altered' || type === 'nodes_collapsed'){
			self.updateMetadataTable()
		}
	});
	this.dataView = new Slick.Data.DataView();
	this._setupDiv();	
	this.columns = [
		{id: "Selected", name: "<img src='static/js/img/tick.png'>", field: "__selected", width: 30, maxWidth:30, minWidth:30, formatter: Slick.Formatters.Checkmark, sortable: true, editor: Slick.Editors.Checkbox, prop:{category:'character', group_num:30, group_order:'occurence'}},
		{id: "index", name: "index", field: "id", width: 40, prop:{category:'numeric', group_num:30, group_order:'standard'}, cssClass:'uneditable-cell'},
	];

	this.options = {
		editable: true,
		enableAddRow: false,
		enableCellNavigation: true,
		asyncEditorLoading: false,
		autoEdit: false,
		multiColumnSort: false,
		showHeaderRow: true,
		headerRowHeight: 30,
		rowHeight: 23,
		explicitInitialization: true,
	};
	this.columnFilters = {};	
	this.source_data = [];
	for (var index in this.source_data) {
		this.source_data[index].id = parseInt(index)+1;
	}
	this.grid = new Slick.Grid("#myGrid", this.dataView, this.columns, this.options);
	this.dataView.onRowCountChanged.subscribe(function (e, args) {
		  self.grid.updateRowCount();
		  self.grid.render();
	});
	this.dataView.onRowsChanged.subscribe(function (e, args) {
		  self.grid.invalidateRows(args.rows);
		  self.grid.render();
	});
	$(this.grid.getHeaderRow()).delegate(":input", "change keyup", function (e, args) {
		var columnId = $(this).data("columnId");
		if (columnId != null) {
			self.columnFilters[columnId] = $.trim($(this).val());
			self.dataView.refresh();
		}
	});
	this.grid.onHeaderRowCellRendered.subscribe(function(e, args) {
		$(args.node).empty();
		$("<input type='text'>")
		.data("columnId", args.column.id)
		.val(self.columnFilters[args.column.id])
		.appendTo(args.node);
	});
	this.grid.init();
	
	this.dataView.beginUpdate();
	this.dataView.setItems(this.source_data);
	this.dataView.setFilter( function(item) {
		for (var columnId in self.columnFilters) {
			if (columnId !== undefined && self.columnFilters[columnId] !== "") {
				var c = self.grid.getColumns()[self.grid.getColumnIndex(columnId)];

				try {
					regfilter = new RegExp(self.columnFilters[columnId], 'i');
					var found = String(item[c.field]).match(regfilter);
					if (! found) {
						return false;
					}
				} catch(e) {
				}
			  }
		}

		return true;
	});
	this.dataView.endUpdate();

		this.grid.onSort.subscribe(function (e, args) {
		  var col = args.sortCol;
		  var data = self.dataView.getItems();
		  $.map(data, function(d) {
				var field = col.field, prop = col.prop;
				if (isNumber(d[field]) && isNumber(parseFloat(d[field]))) {
						d.___v = parseFloat(d[field]), d.___t=0;
				} else {
						d.___t = 1;
						if (d[field] === undefined || d[field] === null) {
							d.___v = "";
						} else {
							d.___v = JSON.stringify(String(d[field]));
						}
				}
		  });
		  data.sort(function (dataRow1, dataRow2) {
				var sign = args.sortAsc ? 1 : -1;
				var result;
				var [value1, t1, value2, t2] = [dataRow1.___v, dataRow1.___t, dataRow2.___v, dataRow2.___t];
				  var result = (t1 - t2)* sign;
				  if (t1 == t2) {
						if (value1 == value2) {
								result = dataRow1.id - dataRow2.id;
						} else {
								result = (value1 > value2 ? 1 : -1)* sign;
						}
				  }
				  return result;
		  });
		self.dataView.setItems(self.data_reformat(data, true));
		self.grid.invalidate();
		self.grid.render();	
	});

	self.grid.selection = [[-1, -1], [-1, -1]];
	this.grid.onClick.subscribe(function(e, args) {
			var cell = self.grid.getCellFromEvent(e);
			if (e.shiftKey) {
				self.grid.selection[1] = [cell.row, cell.cell];
			} else {
				self.grid.selection = [[cell.row, cell.cell], [-1, -1]];
			}
		});
	this.grid.mouse_pos = []; 
	this.grid.onCellChange.subscribe(function (e, args) {
			if (args.cell == 0) {
				var d = args.item;
				self.tree.force_nodes.filter(function(n){if(n.id == d.__Node) {n.selected=d.__selected}});
				self.tree.clearSelection(true);
				self.tree._addHalos(function(d){return d.selected},5,"red");
			} else {
				self.tree.changeCategory($("#metadata-select").val());
			}
		});

	this.grid.setSelectionModel(new Slick.CellSelectionModel());
	this.grid.selectionmodel = self.grid.getSelectionModel();
	this.grid.selectionmodel.onSelectedRangesChanged.subscribe(function(e,args){
		if (args[0].fromCell == args[0].toCell && args[0].fromRow == args[0].toRow && self.grid.selection[0][0] >= 0 && self.grid.selection[1][0] >= 0) {
			var range = {};
			[range.fromRow, range.toRow] = self.grid.selection[0][0] < self.grid.selection[1][0] ? [self.grid.selection[0][0], self.grid.selection[1][0]] : [self.grid.selection[1][0], self.grid.selection[0][0]];
			[range.fromCell, range.toCell] = self.grid.selection[0][1] < self.grid.selection[1][1] ? [self.grid.selection[0][1], self.grid.selection[1][1]] : [self.grid.selection[1][1], self.grid.selection[0][1]];
			self.grid.selectionmodel.setSelectedRanges([range]);
			self.grid.selection[1] = [-1, -1];
			return;
		}
		if (args[0].fromCell == args[0].toCell && self.grid.getColumns()[args[0].fromCell].field === '__selected') {
			var item = self.grid.getData().getFilteredItems().slice(args[0].fromRow, args[0].toRow+1);
			self.selectItems(item);
		}
		
		self.grid.mouse_pos = [args[0].fromRow, args[0].fromCell, args[0].toRow, args[0].toCell];
	});
	$(document).on('metadata:replace', function(e, ui) {
		$("#replace-div").css({
			top :ui.y-20,
			left: ui.x-40,
			position: 'fixed',
		}).show(300);
		$("#replace-tag").focus();
	});
}

D3MSMetadataTable.prototype.selectItems = function(item, selectMode='auto') {
	var self = this;
	var involvedNodes = {}
	var toSelect = (item.filter(function(d) {
					involvedNodes[d.__Node] = 1;
					return d.__selected ? false : true;
				}).length > 0);
	if (selectMode === 'auto') {
		selectMode = toSelect;
	}
	self.tree.force_nodes.filter(function(n){if(involvedNodes[n.id]) {n.selected=selectMode}});
	self.tree.clearSelection(true);
	self.tree._addHalos(function(d){return d.selected},5,"red");
}

D3MSMetadataTable.prototype._setupDiv= function(){
	var self = this;
	var grid_html = "<div id = 'metadata-div' style='font-size:0.75em;width:700px;height:600px;position:absolute;top:10%;left:50%;z-index:2;background-color:#f1f1f1;display:none'>\
		<div id='handler' class='ui-draggable-handle'>\
		<span title='Close The Window' id='metadata-close' class='glyphicon glyphicon-remove show-tooltip' style='top:-3px;float:right;margin-right:0px'></span>\
		<span id ='meta_help' class='glyphicon glyphicon-question-sign' style='top:-3px;float:right;margin-right:5px'></span>\
		<span title='Download This Table' id='metadata-download' class='glyphicon glyphicon-download show-tooltip'><span>Download</span></span>\
		<span title='Add A New Category' id='metadata-add-icon' class='glyphicon glyphicon-plus show-tooltip'><span>Add Columns</span></span>\
		<input type='checkBox' id='selected-only'><span title='Show only selected entries?' class='glyphicon glyphicon-screenshot show-tooltip'><span>Selected only?</span></span>\
		<span title='Clean all filtering criteria?' id='metadata-filter' class='glyphicon glyphicon-filter show-tooltip'><span>Unfilter</span></span>\
	</div>\
	<div id='myGrid' style='width:100%;height:580px'></div>\
	<div title='replace all the cells in the selection' id='replace-div' style='height:30px;width:50px;background-color:#ffffff;z-index:3;opacity:1.0'>\
		<input id='replace-tag' style='height:100%;width:100%'>\
		<span title='Confirm' id='replace-confirm' class='glyphicon glyphicon-ok show-tooltip' style='top:0px;left:100%;float:right;position:absolute'></span>\
		<span id ='replace-close' title='Close'  class='glyphicon glyphicon-remove show-tooltip' style='top:15px;left:100%;float:right;position:absolute'></span>\
	</div>\
	</div>";
	$("body").append($(grid_html));
	$("#meta_help").click(function(e) {
		$(document).trigger('show-help', {id: 'metadata_menu'});
		//getHelpBox('metadata_menu');
	});
	// replace div events
	$('#replace-div').click(function(e){
		e.stopPropagation();
	}).draggable().hide();
	$("#replace-close").click(function(e){
		$("#replace-tag").val("");
		$("#replace-div").hide();
	
	});
	$('#replace-tag').change(function (e) {
		$('#replace-div').width( ($('#replace-tag').val().length + 5) + 'em' );
	});
	$("#replace-confirm").click(function(e) {
		var val = $("#replace-tag").val();
		var columns = self.grid.getColumns();
		var data = self.dataView.getFilteredItems();
		for (var col_id=self.grid.mouse_pos[1]; col_id <= self.grid.mouse_pos[3]; ++col_id ) {
			if (columns[col_id].editor) {
				var col = columns[col_id].field;
				for (var id=self.grid.mouse_pos[0]; id <= self.grid.mouse_pos[2]; id ++) {
					data[id][col] = val;
				}
			}
		}
		self.tree.changeCategory(self.tree.display_category);
		$("#replace-div").hide();
		self.grid.invalidate();
		self.grid.render();
	});
	$("#replace-tag").keypress(function(e){
		if (e.which === 13) {
			$("#replace-confirm").trigger("click");
		}
	});

	// metadata div events
	$('#metadata-div').draggable({
		handle:$('#handler'),
		snapMode: 'both',
	}).resizable({
		handles: 'n, e, s, w, se',
		snapMode: 'both',
	}
	).resize(function(){
		var h=$('#metadata-div').height();
		$('#myGrid').css({'height':(h-$('#myGrid').position().top)+'px'});
		self.grid.resizeCanvas();
	})
	.click(function(e){
		$('#replace-div').hide();
		$("#context-menu").hide();
	})

	$( function() {
		var h=$('#metadata-div').height();
		$('#myGrid').css({'height':(h-50)+'px'});
	});

	$('#metadata-div').hide();

	$('#metadata-close').click(function(e){
		$('#metadata-div').hide(300);
	});
	$("#metadata-filter").click(function(e) {
		self.columnFilters = {Selected:self.columnFilters.Selected};
		self.dataView.refresh();
		$(self.grid.getHeaderRow()).find(':input').val('');
		var headerCell = $(self.grid.getHeaderRow()).find('.l'+self.grid.getColumnIndex('Selected')+' :input');
		headerCell.val( $(this).prop('checked') ? 't' : '');
	});
	$("#selected-only").change(function(e, ui) {
		var headerCell = $(self.grid.getHeaderRow()).find('.l'+self.grid.getColumnIndex('Selected')+' :input');
		headerCell.val( $(this).prop('checked') ? 't' : '');
		headerCell.trigger('change');
		self.updateMetadataTable();
	});
	$("#metadata-add-icon").click(function(e){
		$("<div id ='metadata-add'></div>")
		.html("Name of The New Column:<br> <input type='text' style='height:100%' id ='metadata-add-colname'>")
		.dialog({
				modal: true,
				buttons: {
					"Add": function() {
						name = $("#metadata-add-colname").val();
						if (name && name != "") {
							if (self.addColumnFunction){
								self.addColumnFunction(name);
								$(this).dialog("close");
							}
							else{
								var obj={};
								obj[name]={"label":name}
								self.tree.addMetadataOptions(obj);
								self.updateMetadataTable();
								$(this).dialog("close");
							}
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
		var output = self.meta2tsv();
		saveTextAsFile(output, "metadata.txt");
	});
};

D3MSMetadataTable.prototype.setAddColumnFunction= function(callback){
	this.addColumnFunction = callback;

};

D3MSMetadataTable.prototype.meta2tsv = function(excluded=[]) {
		var header_map = {};
		var headers = this.grid.getColumns()
						.filter(function(col) {
							try {
								return ! excluded.includes(col.id);
							} catch (e) {
								return true;
							} 
						})
						.map(function(col) {
							header_map[col.field] = Object.keys(header_map).length;
							return col.id;
						});

		var data = this.grid.getData().getFilteredItems();

		var output = [headers.join('\t')];
		output.concat(data.map(function(d) {
			var out = []; out.length = headers.length;
			for (key in header_map) {
				out[header_map[key]] = d[key] ? d[key] : '';
			}
			output.push(out.join('\t'));
		}));
		return output.join('\n');
}		
		
D3MSMetadataTable.prototype.data_reformat = function(data, sorted) {
	if (! sorted) {
		$.map(data, function(d) {if (! d.id) {d.id=0;}});

		data.sort(function(d1, d2) {
			return d1.id - d2.id;
		});
	}

	for (var index in data) {
		data[index].id = parseInt(index) + 1;
	}
	return data;
};
		
		
D3MSMetadataTable.prototype.updateMetadataTable =function() {
	if (!this.tree) {
		return;
	}
	//synchronize the columns
	var cols = {};
	for (var field in this.tree.metadata_info) {
		cols[field] = this.tree.metadata_info[field]['label'];
	}
	
	var curr_cols = this.grid.getColumns();
	curr_cols.forEach(function(c) {
		delete cols[c.field];
	});
	cc = Object.keys(cols).sort();
	for (var c_id in cc) {
		var c = cc[c_id];
		if (c != "nothing") {
			if (c == 'barcode' || c == 'ID') {
			curr_cols.push({id: cols[c],
				name: cols[c], 
				field: c, 
				width:120, 
				cssClass:'uneditable-cell',
				sortable: true, 
				prop: this.tree.metadata_info[cols[c]]
			});
			} else {
			curr_cols.push({id: cols[c],
				name: cols[c], 
				field: c, 
				width:80, 
				editor: Slick.Editors.Text, 
				sortable: true, 
				prop: this.tree.metadata_info[cols[c]]
			});
			}
		}

	}
	this.grid.setColumns(curr_cols);
	this.source_data.length = 0;
	for (var id in this.tree.metadata) {
		var d = this.tree.metadata[id];
		if (this.tree.node_map[d.__Node] && (!this.tree.node_map[d.__Node].hypothetical || this.tree.show_hypothetical_nodes)) {
			d.__selected = this.tree.node_map[d.__Node].selected;
			this.source_data.push(d);
		}
	}

	this.data_reformat(this.source_data ); //select_moveUp);
	this.dataView.setItems(this.source_data);
	this.grid.invalidate();
	this.grid.render();
	$(".slick-headerrow-column").attr("title", "Type in to filter records on the columns");
};


/**
* Shows or hides the metadata table depending on wether it is visible
*/
D3MSMetadataTable.prototype.toggleDisplay=function(){
	var self = this;
	if ($("#metadata-div").css('display') === 'none') {
		$('#metadata-div').show(300);
		setTimeout(function(){self.updateMetadataTable(true);}, 400);
	} else {
		$('#metadata-div').hide(300);
	}	
}


D3MSMetadataTable.prototype.sendToMicroReact = function (callback, haveBackend) {
	var url = haveBackend ? '/sendToMicroReact' : 'https://enterobase.warwick.ac.uk/sendToMicroReact';
	var data = {};
	data.tree = this.tree.newickTree;
	data.metadata = this.meta2tsv(['Selected', 'index']);
	var colors = {};
	var display_field = this.tree.display_category;
	var display_field = this.grid.getColumns().filter(function(d) {
			return d.field == display_field;
		})[0]['id'];
	colors[display_field] = this.tree.category_colours;
	data.colors = JSON.stringify(colors);
	data.name = $("#headertag").html();
	$.ajax({
		type: 'POST',
		url: url, 
		data: data
	})
	.done(function(e, ui) {
		callback();
		var microDiag = $("<div id='micro-dialog' title='Sent to MicroReact'>A MicroReact Project has been created. <br><br>Click the following icon to show the page if it was not shown automatically:<br><a id='micro-link' target='_blank'><img src='https://microreact.org/images/logos/microreact.svg' alt='MicroReact' style='width:200px;height:40px'</a><br></div>");
		microDiag.appendTo($('body'));
		var microLink = microDiag.find('#micro-link');
		microLink.attr("href", e);
		microDiag.dialog({ autoOpen: false, 
							close:function(e, ui) {
								$(this).dialog('destroy').remove();
						} });
		microDiag.dialog('open');
		window.open(e, '_blank');
	})
	.fail(function(e, ui) {
		callback();
		var microDiag = $("<div id='micro-dialog' title='Failed with unknown reason'.>Failed with unknown reason<br></div>");
		microDiag.appendTo($('body'));
		var microLink = microDiag.find('#micro-link');
		microLink.attr("href", e);
		microDiag.dialog({ autoOpen: false, 
							close:function(e, ui) {
								$(this).dialog('destroy').remove();
						} });
		microDiag.dialog('open');
	})

}


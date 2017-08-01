
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
	this.default_columns = [
		{id: "Selected", name: "<img src='static/js/img/tick.png'>", field: "__selected", width: 20, formatter: Slick.Formatters.Checkmark, sortable: true, editor: Slick.Editors.Checkbox, prop:{category:'character', group_num:30, group_order:'occurence'}},
		{id: "index", name: "index", field: "id", width: 60, prop:{category:'numeric', group_num:30, group_order:'standard'}, cssClass:'uneditable-cell'},
		//{id: "Barcode", name: "ID", field: "__strain_id", width: 100, cssClass: "cell-title", sortable: true, prop:{category:'character', group_num:30, group_order:'standard'}, cssClass:'uneditable-cell'},
		//{id: "Barcode", name: "Barcode", field: "ID", width: 100, cssClass: "cell-title", sortable: true, prop:{category:'character', group_num:30, group_order:'standard'}, cssClass:'uneditable-cell'}
	];
	this.columns = [
		{id: "Selected", name: "<img src='static/js/img/tick.png'>", field: "__selected", width: 20, formatter: Slick.Formatters.Checkmark, sortable: true, editor: Slick.Editors.Checkbox, prop:{category:'character', group_num:30, group_order:'occurence'}},
		{id: "index", name: "index", field: "id", width: 60, prop:{category:'numeric', group_num:30, group_order:'standard'}, cssClass:'uneditable-cell'},
		//{id: "Barcode", name: "ID", field: "__strain_id", width: 100, cssClass: "cell-title", sortable: true, prop:{category:'character', group_num:30, group_order:'standard'}, cssClass:'uneditable-cell'},
		//{id: "Barcode", name: "Barcode", field: "ID", width: 100, cssClass: "cell-title", sortable: true, prop:{category:'character', group_num:30, group_order:'standard'}, cssClass:'uneditable-cell'}
	];

	this.options = {
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
	this.columnFilters = {};	
	this.source_data = [{id:0,"__strain_id":"12312", "__Node":"20", "__selected":false},{id:1,"_strain_id":"1312", "__Node":"22", "__selected":true}];
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
		var cols = args.sortCols;
		var data = self.dataView.getItems();
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

		self.dataView.setItems(self.data_reformat(data));
		self.grid.invalidate();
		self.grid.render();	
	});
	this.grid.onClick.subscribe(function(e, args) {
			var cell = self.grid.getCellFromEvent(e);
			if (self.grid.getColumns()[cell.cell].field === '__selected') {
				d = self.grid.getDataItem(cell.row);
				d.__selected = d.__selected ? false : true;
				self.tree.force_nodes.filter(function(n){if(n.id == d.__Node) {n.selected=d.__selected}});
				self.tree.clearSelection(true);
				self.tree._addHalos(function(d){return d.selected},5,"red");
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
		self.grid.mouse_pos = [args[0].fromRow, args[0].fromCell, args[0].toRow, args[0].toCell];
	});
	tree.addDisplayChangedListener(function(type,data){
		if (type==='show_hypothetical_nodes'){
			$("#hypo-filter").prop("checked",data);
		
		}	
	});
	$(document).on('metadata:replace', function(e, ui) {
		$("#replace-div").css({
			"top" :ui.y,
			left: ui.x,
			position: 'fixed',
		}).show(300);
	});
}

D3MSMetadataTable.prototype._setupDiv= function(){
	var self = this;
	var grid_html = "<div id = 'metadata-div' style='width:600px;height:600px;position:absolute;top:10%;left:50%;z-index:2;background-color:#f1f1f1;display:none'>\
	<div id='handler' class='ui-draggable-handle'>\
		<span title='Close The Window' id='metadata-close' class='glyphicon glyphicon-remove show-tooltip' style='top:-3px;float:right;margin-right:0px'></span>\
		<span title='Download This Table' id='metadata-download' class='glyphicon glyphicon-download show-tooltip'><span>Download</span></span>\
		<span title='Add A New Category' id='metadata-add-icon' class='glyphicon glyphicon-plus show-tooltip'><span>Add Metadata</span></span>\
		<input type='checkBox' id='metadata-filter' checked=''><span title='Show Filtering Bar?' class='glyphicon glyphicon-filter show-tooltip'><span>Filter</span></span>\
		<input type='checkBox' id='hypo-filter'><span title='Show hypothetical nodes?' class='glyphicon glyphicon-screenshot show-tooltip'><span>Hypo nodes?</span></span>\
	</div>\
	<div id='myGrid' style='width:100%;height:580px'></div>\
	<div title='replace all the cells in the selection' id='replace-div' style='height:30px;width:50px;background-color:#ffffff;z-index:3;opacity:1.0'>\
		<input id='replace-tag' style='height:100%;width:100%'>\
		<span title='Confirm' id='replace-confirm' class='glyphicon glyphicon-ok show-tooltip' style='top:0px;left:100%;float:right;position:absolute'></span>\
		<span id ='replace-close' title='Close'  class='glyphicon glyphicon-remove show-tooltip' style='top:15px;left:100%;float:right;position:absolute'></span>\
	</div>\
	</div>";
	$("body").append($(grid_html));
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
		columns = self.grid.getColumns();
		var col = columns[self.grid.mouse_pos[3]].field;
		if (col == '__selected') {
			var update_selection = {};
			for (var id=self.grid.mouse_pos[0]; id <= self.grid.mouse_pos[2]; id ++) {
				d = self.dataView.getItem(id);
				d[col] = (val && val != 'F' && val != 'f' && val != 'false') ? true : false;
				update_selection[d.__Node] = d[col];
			}
			self.tree.force_nodes.filter(function(n) {if(update_selection[n.id] !== undefined) {n.selected=update_selection[n.id]}});
			self.tree.clearSelection(true);
			self.tree._addHalos(function(d){return d.selected},5,"red");
		} else if (col != '__Node' && col != 'ID' && col != 'id') {
			for (var id=self.grid.mouse_pos[0]; id <= self.grid.mouse_pos[2]; id ++) {
				d = self.dataView.getItem(id);
				d[col] = val;
			}
			self.tree.changeCategory(self.tree.display_category);
		}
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
		handles: 'n, e, s, w',
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
	$("#metadata-filter").change(function(e) {
		if (this.checked) {
			$(".slick-headerrow").show(300);
			self.grid.resizeCanvas();
			$("#myGrid").height($("#myGrid").height()+30);
			$("#metadata-div").height($("#metadata-div").height()+30);
			self.grid.resizeCanvas();
		} else {
			$(".slick-headerrow").hide(300);
			self.grid.resizeCanvas();
			$("#myGrid").height($("#myGrid").height()-30);
			$("#metadata-div").height($("#metadata-div").height()-30);
		}
	});
	$("#hypo-filter").change(function(e) {
		self.tree.toggleHypotheticalNodes();
		self.updateMetadataTable();
	});
	$("#metadata-add-icon").click(function(e){
		$("<div id ='metadata-add'></div>")
		.html("Name of The New Category:<br> <input type='text' style='height:100%' id ='metadata-add-colname'>")
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
		var headers = [], header_map = {}, output = [];
		var curr_cols = self.grid.getColumns();
		for (var id in curr_cols) {
			var col = curr_cols[id];
			header_map[col.field] = headers.length;
			headers.push(col.id);
		}
		output.push(headers.join('\t'));
		data = self.grid.getData().getFilteredItems();
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
};

D3MSMetadataTable.prototype.showTooltip = function() {
	self.grid.setColumns(this.default_columns);
};

D3MSMetadataTable.prototype.setAddColumnFunction= function(callback){
	this.addColumnFunction = callback;

};

		
		
D3MSMetadataTable.prototype.data_reformat = function(data, select_moveUp) {
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
};
		
		
D3MSMetadataTable.prototype.resetGridColumns = function() {
	self.grid.setColumns(this.default_columns);
};

D3MSMetadataTable.prototype.updateMetadataTable =function(select_moveUp) {
	if (!this.tree) {
		return;
	}
	//synchronize the columns
	var cols = {};
	for (var field in this.tree.metadata_info) {
		cols[field] = this.tree.metadata_info[field]['label'];
	}
	
	var curr_cols = this.grid.getColumns();
	for (var id in curr_cols) {
		delete cols[curr_cols[id].field]
	}
	for (var c in cols) {
		if (c != "nothing") {
			if (c == 'Barcode' || c == 'ID') {
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
				width:120, 
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


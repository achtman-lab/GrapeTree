D3MSTreeContextMenu.prototype = Object.create(null)
D3MSTreeContextMenu.prototype.constructor = D3MSTreeContextMenu;

/**
* @constructor
* Creates a new context menu with thr following options
* <ul>
* <li> select all (nodes) </li>
* <li> unselect all (nodes) </li>
* <li> Collapse Selected Nodes</li>
* <li> Expand Selected Nodes </li>
* <li> Expand all </li>
* <li> Center Tree </li>
* <li> Show Hypothetical (Nodes) </li>
* <li> Show Figure Legend </li>
* </ul>
* @param {D3MSTree} The tree to which the context menu will be attached
* @param {InitialData} data An  object containing the tree's data
* @param {function} callback The function to be called when the set up is finished (optional).
* The callback is passed the tree object and a message describing the state of initialisation.
* The message will be 'complete' when the tree is finished
* @param {integer} height - the initial height (optional)
* @param {integer} width - the initial width  (optional)
*/
function D3MSTreeContextMenu(tree,meta_grid,hide_tree_functions){
	this.tree =tree;
	this.meta_grid=meta_grid;
	var self = this;
	$("#context-menu").remove();
	var context_html = "<div id='context-menu' style='display:none;position:fixed;width:150px;z-index:4;background-color:#ffffff;border:1px solid #f2f2f2'> \
		<div id='mst-svg-menu' style='display:none' class='sub-context'> \
			<span id='tree-functions-context'><div class='context-option selectAll'>Select all</div> \
			<div class='context-option clearSelection'>Unselect all</div> \
			<hr class='context-hr'> \
			<div class='context-option' id='collapse_node'>Collapse selected nodes</div> \
			<div class='context-option' id='uncollapse_node'>Expand selected nodes</div> \
			<div class='context-option' id='uncollapse_all'>Expand all</div> \
			<hr class='context-hr'> \
			<div class='context-option' id='center-tree'>Center Tree</div> \
			<div class='context-option switch-hypo'>Hypothetical nodes</div> \
			<hr class='context-hr'> \
			<div class='context-option' id='delete-node'>Delete selected nodes</div> \
			<hr class='context-hr'> \
			</span><div class='context-option toggle-legend'>Show figure legend</div> \
		</div> \
		<div id='legend-svg-menu' style='display:none' class='sub-context'> \
			<div class='context-option toggle-legend'>Hide figure legend</div> \
			<hr class='context-hr'> \
			<b style='font-size:85%'><center>Colour By:&nbsp; \
			<select style='margin:10px' class='context-select' id='color-colname'></select></center></b> \
			<div style='font-size:90%'>Maximum group numbers</div> \
			<center><input id='group-num-input' type='text' class='spin-group context-input' style='width:39px;height:15px' ></input></center> \
			<hr class='context-hr'> \
			<label> Data Category</label> \
			<select style='margin-left:30px;margin-bottom:10px' class='context-select coltype'> \
				<option value='character'>Character</option> \
				<option value='numeric'>Numeric</option> \
			</select> \
			<label> Group Order</label> \
			<select style='margin-left:30px;margin-bottom:10px' class='context-select grouptype'> \
				<option value='size'>Size Desc</option> \
				<option value='alphabetic'>Label Asc</option> \
			</select> \
			<label> Color Scheme</label> \
			<select style='margin-left:30px;margin-bottom:10px' class='context-select colorscheme'> \
				<option value='category'>Category</option> \
				<option value='gradient'>Gradient</option> \
			</select> \
		</div> \
	</div>";

	$("body").append($(context_html));
	var metadata_table_html = "<div id='myGrid-menu' style='display:none' class='sub-context'> \
			<div class='context-option replaceSelection'>Replace selected with ...</div> \
			<hr class='context-hr replaceSelection'> \
			<div class='context-option selectAll'>Select all</div> \
			<div class='context-option clearSelection'>Unselect all</div> \
			<hr class='context-hr'> \
			<div class='context-option switch-hypo'>Hypothetical nodes</div> \
			<div class='context-option toggle-metadata'>Hide metadata table</div> \
				<hr class='context-hr'> \
				<b style='font-size:85%'><center>Column:&nbsp; \
				<select style='margin:5px;margin-top:10px;margin-bottom:10px' class='context-select' id='hover-colname'></select></center></b> \
				<div class='context-option' id='moveleft-category'>Move to left</div> \
				<div class='context-option' id='moveright-category'>Move to right</div> \
				<div id='allowed-color'> \
					<hr class='context-hr'> \
					<div class='context-option' id='change-category'><label>Set as figure legend</label></div> \
					<hr class='context-hr'> \
					<label> Data Category</label> \
					<select style='margin-left:30px;margin-bottom:10px' class='context-select coltype'> \
						<option value='character'>Character</option> \
						<option value='numeric'>Numeric</option> \
					</select> \
					<label> Group Order</label> \
					<select style='margin-left:30px;margin-bottom:10px' class='context-select grouptype'> \
						<option value='size'>Size Desc</option> \
						<option value='alphabetic'>Label Asc</option> \
					</select> \
					<label> Color Scheme</label> \
					<select style='margin-left:30px;margin-bottom:10px' class='context-select colorscheme'> \
						<option value='category'>Category</option> \
						<option value='gradient'>Gradient</option> \
					</select> \
				</div> \
		</div> \
	";
	if (meta_grid){
		$("#context-menu").append( metadata_table_html);
		$("#mst-svg-menu").append("<div class='context-option toggle-metadata'>Show metadata table</div>");
	}
	if (hide_tree_functions){
		$("#tree-functions-context").remove();
	}
	
	$(".context-option").css("font-size", "90%").css("margin", "5px");
	$(".context-hr").css("margin", "2px");
	$("#group-num-input").spinner({
		min:0,
		max:100000
	});
	$("#legend-size-input").spinner({
		value:100,
		min:10,
		max:1000
	});
	document.addEventListener("contextmenu", function(e){
		e.preventDefault();
		var target = null;
		if (e.target.closest('#mst-svg') !== null) {
			target = 'mst-svg';
		} else if (e.target.closest('#legend-svg') !== null) {
			target = 'legend-svg';
		} else if (e.target.closest('#myGrid') !== null) {
			target = 'myGrid';
		}
		self._trigger_context(target, e);
	}, false);
	this._init();
}

D3MSTreeContextMenu.prototype._init=function(){
	var self = this;
	$(".replaceSelection").on("click", function(e) {
		$(document).trigger('metadata:replace', {x:e.clientX, y:e.clientY});
	});
	$(".context-option").on("mouseenter",function(e) {
		$(this).css("background", "#f1f1f1");
	})
	.on("mouseleave", function(e) {
		$(this).css("background", "#ffffff");
	});

	$(document).on("mousedown", function(e) {
		if ( ! e.target.closest || ! e.target.closest("#context-menu")) {
			$("#context-menu").hide();
		}
	});

	$("#context-menu").click(function(e) {
		if ( ! e.target.closest(".ui-spinner")) {
			$("#context-menu").hide();
		}
	});

	$(".context-select").click(function(e) {
		e.stopPropagation();
	})
	.change(function(e) {
		if (e.target.id === 'color-colname') {
			var colname = $("#color-colname").val();
			self.tree.changeCategory(colname);
			$(".coltype").val(self.tree.metadata_info[colname].coltype);
			$(".grouptype").val(self.tree.metadata_info[colname].grouptype);
			$(".colorscheme").val(self.tree.metadata_info[colname].colorscheme);
		} else if (e.target.id == 'hover-colname') {
			var colname = $("#hover-colname").val();
			if (! self.tree.metadata_info[colname]) {
				$("#allowed-color").hide();
			} else {
				$(".coltype").val(self.tree.metadata_info[colname].coltype);
				$(".grouptype").val(self.tree.metadata_info[colname].grouptype);
				$(".colorscheme").val(self.tree.metadata_info[colname].colorscheme);
				$("#allowed-color").show();
				$("#context-menu").height($("#context-menu").height()+$("#allowed-color").height())
			}
		} else {
			var category = (e.target.closest( ('#myGrid-menu'))) ? $("#hover-colname").val() : self.tree.display_category;
			var tochange = $(this).attr('class').split(' ')[1];
			var value = $(this).val();
			self.tree.metadata_info[category][tochange] = value;
			if (category == self.tree.display_category) {
				self.tree.changeCategory(self.tree.display_category);
			}
		}
	});

	$(".switch-hypo").click(function(e) {
		self.tree.toggleHypotheticalNodes();
	});

	$(".clearSelection").on("click", function(e) {
		self.tree.clearSelection();
	});
	
	
	$(".selectAll").on("click", function(e) {
		self.tree.selectAll();
	});
	
	$(".toggle-metadata").click(function(e) {
		if ($("#metadata-div").css('display') === 'none') {
			$('#metadata-div').show(300);
			setTimeout(function(){self.meta_grid.updateMetadataTable(true);}, 400);
		} else {
			$('#metadata-div').hide(300);
		}
	});
	
	$(".toggle-legend").click(function(e) {
		if (self.tree.legend_div.css("display") === "none") {
			self.tree.legend_div.show(300);
		} else {
			self.tree.legend_div.hide(300);
		}
	});
	
	$("#center-tree").click(function(e) {
		self.tree.centerGraph();
	});
	
	$("#collapse_node").click(function(e) {	
		self.tree.collapseSpecificNodes(self.tree.getSelectedNodeIDs());
	});
	$("#delete-node").click(function(e) {
		self.tree.delNodes(self.tree.getSelectedNodeIDs());
	});
	
	$("#uncollapse_all").click(function(e) {
		self.tree.manual_collapsing = {};
		self.tree.collapseNodes(0);
	
	});
	
	$("#uncollapse_node").click(function(e) {
		self.tree.collapseSpecificNodes(self.tree.getSelectedNodeIDs(),true)
	});
	$("#go-left").click(function(e) {
		var row = self.meta_grid.grid.getActiveCell() ? self.meta_grid.grid.getActiveCell().row : 0;
		var col = self.meta_grid.columns[0].field === '__selected' ? 1 : 0;
		self.meta_grid.grid.gotoCell(row, col);
	});
	$("#go-right").click(function(e) {
		var row = self.meta_grid.grid.getActiveCell() ? self.meta_grid.grid.getActiveCell().row : 0;
		self.meta_grid.grid.gotoCell(row,self.meta_grid.columns.length-1);
	});
	$("#moveleft-category").click(function(e) {
		var colname = $("#hover-colname").val();
		for (var id in self.meta_grid.columns) {
			var c = self.meta_grid.columns[id];
			if (c.id === colname) {
				var x = self.meta_grid.columns.splice(id, 1);
				self.meta_grid.columns.unshift(x[0]);
				break;
			}
		}
		self.meta_grid.updateMetadataTable();
	})
	$("#moveright-category").click(function(e) {
		var colname = $("#hover-colname").val();
		for (var id in self.meta_grid.columns) {
			var c = self.meta_grid.columns[id];
			if (c.id === colname) {
				self.meta_grid.columns.push(self.meta_grid.columns.splice(id, 1));
				break;
			}
		}
		self.meta_grid.updateMetadataTable();
	})
	
	$("#change-category").click(function(e) {
		var colname = $("#hover-colname").val();
		if (!colname){
			colname = 'nothing';
		}
		self.tree.changeCategory(colname);
	});

	$("#group-num-input").on("change", function(e) {
		self.tree.category_num = parseInt($("#group-num-input").val());
		self.tree.changeCategory($("#metadata-select").val());
	})
	.spinner({
		spin: function(e, ui) {
			$(this).spinner("value", ui.value);
			//$(this).trigger('change');
		},
		change: function(e, ui) {
			$(this).trigger('change');
		}
	}).keypress(function(e){
		if (e.which === 13) {
			$(this).spinner("value", $(this).val());
		}
	});
};




D3MSTreeContextMenu.prototype._trigger_context=function(target, e) {
	var self = this;
	$('.sub-context').hide();

	$(".switch-hypo").text(this.tree.show_hypothetical_nodes ? "Hide hypothetical" : "Show hypothetical")
	if ($("#metadata-div").css('display') === 'none') {
		$(".toggle-metadata").text("Show metadata table");
	} else {
		$(".toggle-metadata").text("Hide metadata table");
	}


	if (this.tree && this.tree.legend_div.css("display") === "none") {


		$(".toggle-legend").text("Show figure legend");
	} else {
		$(".toggle-legend").text("Hide figure legend");
	}
	if (target == 'mst-svg') {
		$("#mst-svg-menu").show();
		$("#context-menu").draggable().css("left", e.pageX).css("top", e.pageY).show();
		$("#context-menu").height($("#mst-svg-menu").height()+5);
	} else if (target == 'legend-svg') {
		var category = this.tree.display_category;
		if (category != 'nothing') {
			if (! this.tree.metadata_info[category]) {
				this.tree.metadata_info[category] = {coltype : 'character', grouptype : 'size', colorscheme : 'category'};
			}
			$(".coltype").val(this.tree.metadata_info[category].coltype);
			$(".grouptype").val(this.tree.metadata_info[category].grouptype);
			$(".colorscheme").val(this.tree.metadata_info[category].colorscheme);
		}
		$("#color-colname").empty().append(function() {
			var col = Object.keys(self.tree.metadata_info).sort();
			var output = col.map(function(category) {
				var label = self.tree.metadata_info[category]['label'];
				return "<option value='"+category+"'>" + label+ "</option>";
			});
			return output.join('');
		});
		$("#color-colname").val(category);

		$("#group-num-input").spinner("value", this.tree.category_num);

		$("#legend-svg-menu").show();
		$("#context-menu").draggable().css("left", e.pageX).css("top", e.pageY).show();
		$("#context-menu").height($("#legend-svg-menu").height()+5);

	} else if (target == 'myGrid') {
		$("#hover-colname").empty().append(function() {
			var col = Object.keys(self.tree.metadata_info).sort();
			var output = col.map(function(category) {
				var label = self.tree.metadata_info[category]['label'];
				return "<option value='"+category+"'>" + label+ "</option>";
			});
			return output.join('');
		})

		var colname = $("#myGrid .ui-state-hover").text();
		if (! colname) {

			if (self.meta_grid.grid.getCellFromEvent(e)) {
				colname = self.meta_grid.grid.getColumns()[self.meta_grid.grid.getCellFromEvent(e).cell].field;
			} else {
				colname = Object.keys(the_tree.metadata_info)[0];
			}

		}
		if (! this.tree.metadata_info[colname]) {
			for (var c in this.tree.metadata_info) {
				if (this.tree.metadata_info[c].label === colname) {
					colname = c;
					break;
				}
			}
		}

		$("#hover-colname").val(colname);

		if (! this.tree.metadata_info[colname]) {
			$("#allowed-color").hide();
		} else {
			$("#allowed-color").show();
			$(".coltype").val(this.tree.metadata_info[colname].coltype);
			$(".grouptype").val(this.tree.metadata_info[colname].grouptype);
			$(".colorscheme").val(this.tree.metadata_info[colname].colorscheme);
		}

		$("#myGrid-menu").show();
		$("#context-menu").draggable().css("left", e.pageX).css("top", e.pageY).show();
		$("#context-menu").height($("#myGrid-menu").height()+5);
	};
};







var context_html = "<div id='context-menu' style='display:none;position:fixed;width:150px;z-index:4;background-color:#ffffff;border:1px solid #f2f2f2'> \
	<div id='mst-svg-menu' style='display:none' class='sub-context'> \
		<div class='context-option selectAll'>Select all</div> \
		<div class='context-option clearSelection'>Unselect all</div> \
		<hr class='context-hr'> \
		<div class='context-option' id='collapse_node'>Collapse selected nodes</div> \
		<div class='context-option' id='uncollapse_node'>Expand selected nodes</div> \
		<div class='context-option' id='uncollapse_all'>Expand all</div> \
		<hr class='context-hr'> \
		<div class='context-option' id='center-tree'>Center Tree</div> \
		<div class='context-option switch-hypo'>Hypothetical nodes</div> \
		<hr class='context-hr'> \
		<div class='context-option toggle-metadata'>Show metadata table</div> \
		<div class='context-option toggle-legend'>Show figure legend</div> \
	</div> \
	<div id='myGrid-menu' style='display:none' class='sub-context'> \
		<div class='context-option selectAll'>Select all</div> \
		<div class='context-option clearSelection'>Unselect all</div> \
		<hr class='context-hr'> \
		<div class='context-option switch-hypo'>Hypothetical nodes</div> \
		<div class='context-option toggle-metadata'>Hide metadata table</div> \
		<div id='hover-col' style='display:none'> \
			<hr class='context-hr'> \
			<b style='font-size:85%'><center>Column:&nbsp;<label style='margin-top:10px' id='hover-colname'></label></center></b> \
			<div class='context-option' id='change-category'>Set as figure legend</div> \
			<hr class='context-hr'> \
			<label> Data Category</label> \
			<select style='margin-left:30px;margin-bottom:10px' class='context-select coltype'> \
				<option value='character'>Character</option> \
				<option value='numeric'>Numeric</option> \
			</select> \
			<label> Group Order</label> \
			<select style='margin-left:30px;margin-bottom:10px' class='context-select grouptype'> \
				<option value='size'>Size Desc</option> \
				<option value='alphabetic'>Alphabetic</option> \
			</select> \
			<label> Color Scheme</label> \
			<select style='margin-left:30px;margin-bottom:10px' class='context-select colorscheme'> \
				<option value='category'>Category</option> \
				<option value='gradient'>Gradient</option> \
			</select> \
		</div> \
	</div> \
	<div id='legend-svg-menu' style='display:none' class='sub-context'> \
		<div class='context-option toggle-legend'>Hide figure legend</div> \
		<hr class='context-hr'> \
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
			<option value='alphabetic'>Alphabetic</option> \
		</select> \
		<label> Color Scheme</label> \
		<select style='margin-left:30px;margin-bottom:10px' class='context-select colorscheme'> \
			<option value='category'>Category</option> \
			<option value='gradient'>Gradient</option> \
		</select> \
	</div> \
</div>";

$("body").append($(context_html));
$(".context-option").css("font-size", "90%").css("margin", "5px");
$(".context-hr").css("margin", "2px");

$("#group-num-input").spinner({
	min:0,
	max:300
});
$("#legend-size-input").spinner({
	value:100,
	min:10,
	max:1000
});

function trigger_context(target, e) {
	$('.sub-context').hide();

	$(".switch-hypo").text($("#hypo-filter").prop('checked') ? "Hide hypothetical" : "Show hypothetical")
	if ($("#metadata-div").css('display') === 'none') {
		$(".toggle-metadata").text("Show metadata table");
	} else {
		$(".toggle-metadata").text("Hide metadata table");
	}
	if (the_tree.legend_div.css("display") === "none") {
		$(".toggle-legend").text("Show figure legend");
	} else {
		$(".toggle-legend").text("Hide figure legend");
	}
	if (target == 'mst-svg') {
		$("#mst-svg-menu").show();
		$("#context-menu").draggable().css("left", e.pageX).css("top", e.pageY).show();
		$("#context-menu").height($("#mst-svg-menu").height()+5);
	} else if (target == 'legend-svg') {
		var category = the_tree.display_category;
		if (category != 'nothing') {
			if (! the_tree.metadata_info[category]) {
				the_tree.metadata_info[category] = {coltype : 'character', grouptype : 'size', colorscheme : 'category'};
			}
			$(".coltype").val(the_tree.metadata_info[category].coltype);
			$(".grouptype").val(the_tree.metadata_info[category].grouptype);
			$(".colorscheme").val(the_tree.metadata_info[category].colorscheme);
		}

		$("#group-num-input").spinner("value", the_tree.category_num);

		$("#legend-svg-menu").show();
		$("#context-menu").draggable().css("left", e.pageX).css("top", e.pageY).show();
		$("#context-menu").height($("#legend-svg-menu").height()+5);

	} else if (target == 'myGrid') {
		var colname = $(".ui-state-hover .slick-column-name").text();
		if (! the_tree.metadata_info[colname]) {
			$("#hover-col").hide();
		} else {
			$(".coltype").val(the_tree.metadata_info[colname].coltype);
			$(".grouptype").val(the_tree.metadata_info[colname].grouptype);
			$(".colorscheme").val(the_tree.metadata_info[colname].colorscheme);

			$("#hover-col #hover-colname").text(colname);
			$("#hover-col").show();
		}

		$("#myGrid-menu").show();
		$("#context-menu").draggable().css("left", e.pageX).css("top", e.pageY).show();
		$("#context-menu").height($("#myGrid-menu").height()+5);
	};
};

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
	trigger_context(target, e);
}, false);

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
	var category = (e.target.closest( ('#hover-col'))) ? $("#hover-colname").text() : the_tree.display_category;
	var tochange = $(this).attr('class').split(' ')[1];
	var value = $(this).val();
	the_tree.metadata_info[category][tochange] = value;
	if (category == the_tree.display_category) {
		the_tree.changeCategory(the_tree.display_category);
	}
});

$(".switch-hypo").click(function(e) {
	$("#hypo-filter").prop('checked', $("#hypo-filter").prop('checked') ? false : true);
	$("#hypo-filter").trigger("change");
})

$(".clearSelection").on("click", function(e) {
	the_tree.clearSelection();
});


$(".selectAll").on("click", function(e) {
	the_tree.selectAll();
});

$(".toggle-metadata").click(function(e) {
	if ($("#metadata-div").css('display') === 'none') {
		$('#metadata-div').show(300);
		setTimeout(function(){updateMetadataTable(true);}, 400);
	} else {
		$('#metadata-div').hide(300);
	}
});

$(".toggle-legend").click(function(e) {
	if (the_tree.legend_div.css("display") === "none") {
		the_tree.legend_div.show(300);
	} else {
		the_tree.legend_div.hide(300);
	}
});

$("#center-tree").click(function(e) {
	$("#center-graph-button").trigger("click");
});

$("#collapse_node").click(function(e) {
	var selected_nodes = the_tree.force_nodes.filter(function(d){return d.selected});
	for (var id in selected_nodes) {
		var node_id = selected_nodes[id].id;
		for (var jd in the_tree.hypo_record[node_id]) {
			the_tree.manual_collapsing[jd] = 1;
		}
	}
	$( "#spinner-collapse-nodes" ).trigger("change");
});
$("#uncollapse_all").click(function(e) {
	the_tree.manual_collapsing = {};
	$( "#spinner-collapse-nodes" ).trigger("change");
});

$("#uncollapse_node").click(function(e) {
	var selected_nodes = the_tree.force_nodes.filter(function(d){return d.selected});
	for (var id in selected_nodes) {
		var node_id = selected_nodes[id].id;
		for (var jd in the_tree.hypo_record[node_id]) {
			delete the_tree.manual_collapsing[jd];
		}
	}
	$( "#spinner-collapse-nodes" ).trigger("change");
});

$("#change-category").click(function(e) {
	var colname = $("#hover-col #hover-colname").text();
	$("#metadata-select").val(colname);
	if (! $("#metadata-select").val()) {
		$("#metadata-select").val("nothing");
	}
	$("#metadata-select").trigger("change");
});

$("#group-num-input").on("change", function(e) {
	the_tree.category_num = parseInt($("#group-num-input").val());
	if($(".ui-state-hover").hasClass("ui-spinner-up")) {
		the_tree.category_num += 1;
	} else if($(".ui-state-hover").hasClass("ui-spinner-down")) {
		the_tree.category_num -= 1;
	}
	the_tree.changeCategory($("#metadata-select").val());
})
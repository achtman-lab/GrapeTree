var context_html = "<div id='context-menu' style='display:none;position:fixed;width:140px;z-index:4;background-color:#ffffff;border:1px solid #f2f2f2'> \
	<div id='mst-svg-menu' style='display:none' class='sub-context'> \
		<div class='context-option selectAll'>Select all</div> \
		<div class='context-option clearSelection'>Unselect all</div> \
		<hr class='context-hr'> \
		<div class='context-option' id='collapse_node'>Collapse selected node</div> \
		<div class='context-option' id='uncollapse_node'>Expand selected node</div> \
		<hr class='context-hr'> \
		<div class='context-option show-metadata'>Show metadata table</div> \
		<div class='context-option' id='show-legend'>Show figure legend</div> \
	</div> \
	<div id='myGrid-menu' style='display:none' class='sub-context'> \
		<div class='context-option selectAll'>Select all</div> \
		<div class='context-option clearSelection'>Unselect all</div> \
		<hr class='context-hr'> \
		<div class='context-option hide-metadata'>Hide metadata table</div> \
		<div id='hover-col' style='display:none'> \
			<hr class='context-hr'> \
			<b style='font-size:75%'><center>Column:&nbsp;<label style='margin-top:10px' id='hover-colname'></label></center></b> \
			<div class='context-option' id='change-category'>Set as figure legend</div> \
		</div> \
	</div> \
	<div id='legend-svg-menu' style='display:none' class='sub-context'> \
		<div style='font-size:80%'>Maximum group numbers</div> \
		<center><input id='group-num-input' type='text' class='spin-group context-input' style='width:39px;height:15px' ></input></center> \
		<hr class='context-hr'> \
		<div class='context-option' id='hide-legend'>Hide figure legend</div> \
	</div> \
</div>";

$("body").append($(context_html));
$(".context-option").css("font-size", "80%").css("margin", "5px");
$(".context-mouseover")
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


document.addEventListener("contextmenu", function(e){
    e.preventDefault();
	$('.sub-context').hide();
	if (e.target.closest('#mst-svg') !== null) {
		$("#mst-svg-menu").show();
		$("#context-menu").draggable().css("left", e.pageX).css("top", e.pageY).show();
		$("#context-menu").height($("#mst-svg-menu").height()+5);
	} else if (e.target.closest('#legend-svg') !== null) {
		$("#group-num-input").spinner("value", the_tree.category_num);
		$("#legend-svg-menu").show();
		$("#context-menu").draggable().css("left", e.pageX).css("top", e.pageY).show();
		$("#context-menu").height($("#legend-svg-menu").height()+5);
	} else if (e.target.closest('#myGrid') !== null) {
		var colname = $(".ui-state-hover .slick-column-name").text();
		if (colname == '') {
			$("#hover-col").hide();
		} else {
			$("#hover-col #hover-colname").text(colname);
			$("#hover-col").show();
		}
		$("#myGrid-menu").show();
		$("#context-menu").draggable().css("left", e.pageX).css("top", e.pageY).show();
		$("#context-menu").height($("#myGrid-menu").height()+5);
	}
}, false);

$(".context-option").on("mouseenter",function(e) {
	$(this).css("background", "#f1f1f1");
})
.on("mouseleave", function(e) {
	$(this).css("background", "#ffffff");
});

$(document).on("mousedown", function(e) {
	if ( ! e.target.closest("#context-menu")) {
		$("#context-menu").hide();
	}
});

$("#context-menu").click(function(e) {
	if ( ! e.target.closest(".ui-spinner")) {
		$("#context-menu").hide();
	}
});

$(".clearSelection").on("click", function(e) {
	the_tree.clearSelection();
});


$(".selectAll").on("click", function(e) {
	the_tree.selectAll();
});

$(".show-metadata").click(function(e) {
	$('#metadata-div').show(300);
	setTimeout(function(){updateMetadataTable(true);}, 400);
});

$(".hide-metadata").click(function(e) {
	$('#metadata-div').hide(300);
});

$("#collapse_node").click(function(e) {
	var selected_nodes = the_tree.force_nodes.filter(function(d){return d.selected});
	for (var id in selected_nodes) {
		var node_id1 = selected_nodes[id].id;
		for (var jd in the_tree.grouped_nodes[node_id1]) {
			var node_id = the_tree.grouped_nodes[node_id1][jd];
			the_tree.manual_collapsing[node_id] = 1;
			if (the_tree.hypo_record && the_tree.hypo_record[node_id]) {
				for(var hid in the_tree.hypo_record[node_id]) {
					the_tree.manual_collapsing[hid] = 1;
				}
			}
		}
	}
	$( "#spinner-collapse-nodes" ).trigger("change");
});
$("#uncollapse_node").click(function(e) {
	var selected_nodes = the_tree.force_nodes.filter(function(d){return d.selected});
	for (var id in selected_nodes) {
		var node_id1 = selected_nodes[id].id;
		for (var jd in the_tree.grouped_nodes[node_id1]) {
			var node_id = the_tree.grouped_nodes[node_id1][jd];
			delete the_tree.manual_collapsing[node_id];
			if (the_tree.hypo_record && the_tree.hypo_record[node_id]) {
				for(var hid in the_tree.hypo_record[node_id]) {
					delete the_tree.manual_collapsing[hid];
				}
			}
		}
	}
	$( "#spinner-collapse-nodes" ).trigger("change");
});

$("#show-legend").click(function(e) {
	the_tree.legend_div.show();
});

$("#hide-legend").click(function(e) {
	the_tree.legend_div.hide();
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
	the_tree.changeCategory($("#metadata-select").val());
})
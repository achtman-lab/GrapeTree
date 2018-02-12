#include <vector>
#include <algorithm>
#include <iostream>
#include <fstream>
#include <string>
#include <iterator>
#include <boost/property_map/property_map.hpp>
#include <boost/graph/adjacency_list.hpp>
#include <boost/algorithm/string.hpp>

#include "edmonds_optimum_branching.hpp"

// Define a directed graph type that associates a weight with each
// edge. We store the weights using internal properties as described
// in BGL.
typedef boost::property<boost::edge_weight_t, double>       EdgeProperty;
typedef boost::adjacency_list<boost::listS,
                              boost::vecS,
                              boost::directedS,
                              boost::no_property,
                              EdgeProperty>                 Graph;
typedef boost::graph_traits<Graph>::vertex_descriptor       Vertex;
typedef boost::graph_traits<Graph>::edge_descriptor         Edge;


int edmonds(char* filename) {
	std::ifstream infile(filename);
	std::string line;
	std::vector<std::string> strs;
	std::getline(infile, line);
	boost::split(strs, line, boost::is_any_of("\t "));
	// Graph with N vertices    
	int N = strs.size();
	Graph G(N);
	
	// Create a vector to keep track of all the vertices and enable us to index them.
	std::vector<Vertex> the_vertices;
	BOOST_FOREACH (Vertex v, vertices(G))
	{
		the_vertices.push_back(v);
	}
	for (int n=0; n < N; ++n) {
		float v = std::atof(strs[n].c_str());
		add_edge(the_vertices[0], the_vertices[n], v, G);
	}
	int m = 1;
	for (std::string line; std::getline(infile, line);++ m) {
		boost::split(strs, line, boost::is_any_of("\t "));
		for (int n=0; n < N; ++n) {
			float v = std::atof(strs[n].c_str());
			add_edge(the_vertices[m], the_vertices[n], v, G);
		}
		if (m >=N-1) break;
	}
	infile.close();
    // This is how we can get a property map that gives the weights of
    // the edges.
    boost::property_map<Graph, boost::edge_weight_t>::type weights =
        get(boost::edge_weight_t(), G);
    
    // This is how we can get a property map mapping the vertices to
    // integer indices.
    boost::property_map<Graph, boost::vertex_index_t>::type vertex_indices =
        get(boost::vertex_index_t(), G);

    // Find the maximum branching.
    std::vector<Edge> branching;
    edmonds_optimum_branching<false, true, false>(G,
                                                  vertex_indices,
                                                  weights,
                                                  static_cast<Vertex *>(0),
                                                  static_cast<Vertex *>(0),
                                                  std::back_inserter(branching));
    
	// return the array as a numpy array (numpy will free it later)
    BOOST_FOREACH (Edge e, branching) {
		std::cout << boost::source(e, G) << "\t" << boost::target(e, G) << "\t" << get(weights, e) << std::endl;
    }
	return 0;
}


int main(int argc, char *argv[]) {
	return edmonds(argv[1]);
}

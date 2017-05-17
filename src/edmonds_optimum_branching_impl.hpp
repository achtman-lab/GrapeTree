#ifndef EDMONDS_OPTIMUM_BRANCHING_IMPL_HPP
#define EDMONDS_OPTIMUM_BRANCHING_IMPL_HPP

#include <vector>
#include <algorithm>
#include <list>
#include <boost/property_map/property_map.hpp>
#include <boost/foreach.hpp>
#include <boost/graph/graph_traits.hpp>
#include <boost/graph/graph_concepts.hpp>
#include <boost/concept_check.hpp>
#include <boost/pending/disjoint_sets.hpp>



// namespace detail
//
// The namespace encapsulates classes and/or functions that are
// required for the implementation of edmonds's optimum branching
// algorithm which should not be visible to the user. This way the
// global namespace remains unpolluted.
namespace detail {
    using namespace boost;



    // class OptimumBranching
    //
    // I encapsulate all the details of edmonds's algorithm inside a
    // class. This makes the code easier to read (and easier to write)
    // since the number of template declarations is reduced
    // considerably. Besides, all the utility functions used to
    // implement one algorithm conceptually do belong together.
    //
    // Note that any concept checks are performed in the function that
    // uses this class, so there is no need to repeat them here.
    template <bool TOptimumIsMaximum,
              bool TAttemptToSpan,
              bool TGraphIsDense,
              class TEdgeListGraph,
              class TVertexIndexMap,
              class TWeightMap,
              class TInputIterator,
              class TOutputIterator>
    class OptimumBranching {
    public:
        typedef TEdgeListGraph                                        Graph;
        typedef typename graph_traits<Graph>::edge_descriptor         Edge;
        typedef typename graph_traits<Graph>::vertex_descriptor       Vertex;
        typedef typename graph_traits<Graph>::edge_iterator           EdgeIter;
        typedef typename property_traits<TWeightMap>::value_type      weight_t;
        typedef typename property_traits<TVertexIndexMap>::value_type vertex_idx_t;



        // struct EdgeNode
        //
        // One unique EdgeNode object is created for each edge of the
        // input graph. Any containers then store pointers to these
        // objects. The edges of the graph F (which is described in
        // the document describing the implementation) are stored in
        // each EdgeNode object via the parent and children members.
        // For efficiency reasons a boolean member 'removed_from_F' is
        // also present in each EdgeNode object. If this member is
        // set, then the edge (which is also a vertex in F) was
        // removed during the expansion phase of the algorithm.
        struct EdgeNode {
            Edge                        edge;
            vertex_idx_t                source;
            vertex_idx_t                target;
            weight_t                    weight;
            EdgeNode                   *parent;
            std::vector<EdgeNode *>     children;
            bool                        removed_from_F;
            
            EdgeNode(const Edge &e,
                     const vertex_idx_t &s,
                     const vertex_idx_t &t,
                     const weight_t w)
                : edge(e), source(s), target(t), weight(w), parent(0),
                  removed_from_F(false)
            {
                ;
            }

            // operator<
            //
            // This is only used temporarily when sorting the
            // EdgeNodes by their sources. Once a radix-sort algorithm
            // has been implemented, this is no longer needed.
            bool        operator<(const EdgeNode &en) const
            {
                return source < en.source;
            }
        };
        


        // The data members of the OptimumBranching class. These
        // include both the input and the variables needed internally for the implemenationa.
        const TEdgeListGraph   &g;
        const TVertexIndexMap  &index;
        const TWeightMap       &weight;
        TInputIterator          roots_begin;
        TInputIterator          roots_end;
        TOutputIterator         out;
        
        // The constructor
        OptimumBranching(const TEdgeListGraph &g,
                         const TVertexIndexMap &index,
                         const TWeightMap &weight,
                         TInputIterator roots_begin,
                         TInputIterator roots_end,
                         TOutputIterator out)
            : g(g), index(index), weight(weight),
              roots_begin(roots_begin), roots_end(roots_end), out(out)
        {
            ;
        }



        // remove_from_F()
        //
        // It removes the EdgeNode en and all its ancestors from the
        // graph F (by resetting the parent and children members and
        // setting the flag removed_from_F). Any newly created roots
        // of F are inserted into F_roots. Note that the root of F
        // that is removed as a consequence is not actually removed
        // from F_roots. It is simply marked as removed via the
        // 'removed_from_F' flag.
        void remove_from_F(EdgeNode *en, std::vector<EdgeNode *> &F_roots)
        {
            // Note that en is inserted into F_roots as well. But
            // since it is marked as removed_from_F it will not cause
            // any trouble. This is more efficient than making sure
            // that only the siblings of en are inserted into F_roots.
            for ( ; en != 0; en = en->parent)
            {
                en->removed_from_F = true;
                BOOST_FOREACH (EdgeNode *child, en->children)
                {
                    F_roots.push_back(child);
                    child->parent = 0;
                }

                // free the memory used in en->children.
                std::vector<EdgeNode *>().swap(en->children);
            }
        }

        
        // sort_edges()
        //
        // sorts a vector of EdgeNode pointers with EdgeNode.source as
        // key using the radix-sort algorithm. Also, if there are
        // several EdgeNode pointers with the same source, the
        // function only keeps the one with optimum weight.
        void sort_edges(std::vector<EdgeNode *> &edge_vec)
        {
            const int byte_len = 8;
            const int num_buckets = 1u << byte_len;
            const unsigned digits = (sizeof (vertex_idx_t)) * std::numeric_limits<unsigned char>::digits;
            const unsigned mask = (1u << byte_len) - 1;

            std::vector< std::list<EdgeNode *> > buckets(num_buckets);

            for (unsigned i = 0; byte_len * i <= digits; ++i)
            {
                BOOST_FOREACH (EdgeNode *en, edge_vec)
                {
                    buckets[(en->source >> byte_len * i) & mask].push_back(en);
                }

                edge_vec.clear();
                BOOST_FOREACH (std::list<EdgeNode *> &bucket, buckets)
                {
                    BOOST_FOREACH (EdgeNode *en, bucket)
                    {
                        if (!edge_vec.empty() && edge_vec.back()->source == en->source)
                        {
                            bool en_is_better = TOptimumIsMaximum ?
                                en->weight > edge_vec.back()->weight :
                                en->weight < edge_vec.back()->weight;
                            if (en_is_better)
                            {
                                edge_vec.back() = en;
                            }
                        }
                        else
                        {
                            edge_vec.push_back(en);
                        }
                    }
                }

                buckets.clear();
                buckets.resize(num_buckets);
            }
        }


        // operator()
        //
        // This is the main function implementing Tarjan's
        // implementation of Edmonds's algorithm.
        void operator()()
        {
            std::vector<EdgeNode> all_edges;
            vertex_idx_t max_vertex_idx;

            // Create EdgeNodes for all the edges and find the maximum vertex
            // index. Note that we skip self-loops.
            max_vertex_idx = 0;
            BOOST_FOREACH (const Edge &e, edges(g))
            {
                if (source(e, g) == target(e, g))
                    continue;

                all_edges.push_back(EdgeNode (e, source(e, g), target(e, g), get(weight, e)));
                max_vertex_idx = std::max(max_vertex_idx, index[target(e, g)]);
            }

            // insert into in_edges[v] all edges entering v.

            //!! TODO !! If sparse graphs, I have to change the
            //representation of in_edges to a special kind of priority
            //queue that are able to be merged in log n time.

            std::vector< std::vector<EdgeNode *> > in_edges(max_vertex_idx + 1);
            std::vector<weight_t> edge_weight_change(max_vertex_idx + 1);
            BOOST_FOREACH (EdgeNode &en, all_edges)
            {
                in_edges[en.target].push_back(&en);
            }
            BOOST_FOREACH (std::vector<EdgeNode *> &edges, in_edges)
            {
                sort_edges(edges);
            }

            // Save the specified roots in a random access fashion.
            std::vector<bool> is_specified_root(max_vertex_idx + 1);
            std::vector<vertex_idx_t> final_roots;
            for ( ; roots_begin != roots_end; ++roots_begin)
            {
                is_specified_root[index[*roots_begin]] = true;
                final_roots.push_back(index[*roots_begin]);
            }

            // Initialize S, W, roots, cycles, lambda, enter, F, and min
            std::vector< std::vector<EdgeNode *> > cycle(max_vertex_idx + 1);
            std::vector<EdgeNode *> lambda(max_vertex_idx + 1);
            std::vector<vertex_idx_t> roots;
            disjoint_sets_with_storage<> S(2*(max_vertex_idx +1));
            disjoint_sets_with_storage<> W(2*(max_vertex_idx +1));
            std::vector<vertex_idx_t> min(max_vertex_idx + 1);
            std::vector<EdgeNode *> enter(max_vertex_idx + 1);
            std::vector<EdgeNode *> F;
            for (vertex_idx_t v = 0; v <= max_vertex_idx; ++v)
            {
                S.make_set(v);
                W.make_set(v);
                min[v] = v;
                if (!is_specified_root[v])
                    roots.push_back(v);
            }

            // Keep adding critical edges and contracting cycles while
            // doing a whole bunch of book-keeping.
            while (!roots.empty())
            {
                // Find an S-component with an entering edge
                vertex_idx_t cur_root = roots.back(); roots.pop_back();
                if (in_edges[cur_root].empty())
                {
                    final_roots.push_back(min[cur_root]);
                    continue;
                }

                // Find an optimum-weight edge entering cur_root

                //!! TODO !! We have to do this differently for sparse graphs.
                EdgeNode *critical_edge = in_edges[cur_root].front();
                BOOST_FOREACH (EdgeNode *en, in_edges[cur_root])
                {
                    bool en_is_better = TOptimumIsMaximum ?
                        en->weight > critical_edge->weight :
                        en->weight < critical_edge->weight;
                    if (en_is_better)
                    {
                        critical_edge = en;
                    }
                }
                
                // Do not add critical_edge if it worsens the total
                // weight and we are not attempting to span.
                if (!TAttemptToSpan)
                {
                    bool improves = TOptimumIsMaximum ?
                        critical_edge->weight > weight_t(0) :
                        critical_edge->weight < weight_t(0);
                    if (!improves)
                    {
                        final_roots.push_back(min[cur_root]);
                        continue;
                    }
                }
                
                // Insert critical_edge into "F" and let any edges in
                // cycle[cur_root] be its children.
                F.push_back(critical_edge);
                BOOST_FOREACH (EdgeNode *en, cycle[cur_root])
                {
                    en->parent = critical_edge;
                    critical_edge->children.push_back(en);
                }

                // If critical_edge is a leaf in "F", then add a
                // pointer to it.
                if (cycle[cur_root].empty())
                {
                    lambda[cur_root] = critical_edge;
                }

                // If adding critical_edge didn't create a cycle
                if (W.find_set(critical_edge->source) !=
                    W.find_set(critical_edge->target))
                {
                    enter[cur_root] = critical_edge;
                    W.union_set(critical_edge->source, critical_edge->target);
                }
                else // If adding critical_edge did create a cycle
                {
                    // Find the edges of the cycle, the
                    // representatives of the strong components in the
                    // cycle, and the least costly edge of the cycle.
                    std::vector<EdgeNode *> cycle_edges;
                    std::vector<vertex_idx_t> cycle_repr;
                    EdgeNode *least_costly_edge = critical_edge;
                    enter[cur_root] = 0;

                    cycle_edges.push_back(critical_edge);
                    cycle_repr.push_back(S.find_set(critical_edge->target));
                    for (vertex_idx_t v = S.find_set(critical_edge->source);
                         enter[v] != 0; v = S.find_set(enter[v]->source))
                    {
                        cycle_edges.push_back(enter[v]);
                        cycle_repr.push_back(v);
                        bool is_less_costly = TOptimumIsMaximum ?
                            enter[v]->weight < least_costly_edge->weight :
                            enter[v]->weight > least_costly_edge->weight;
                        if (is_less_costly)
                        {
                            least_costly_edge = enter[v];
                        }
                    }
                    // change the weight of the edges entering
                    // vertices of the cycle.
                    //!! TODO !! Change this for sparse graphs
                    BOOST_FOREACH (EdgeNode *en, cycle_edges)
                    {
                        edge_weight_change[S.find_set(en->target)] =
                            least_costly_edge->weight - en->weight;
                    }

                    // Save the vertex that would be root if the newly
                    // created strong component would be a root.
                    vertex_idx_t cycle_root =
                        min[S.find_set(least_costly_edge->target)];

                    // Union all components of the cycle into one component.
                    vertex_idx_t new_repr = cycle_repr.front();
                    BOOST_FOREACH (vertex_idx_t v, cycle_repr)
                    {
                        S.link(v, new_repr);
                        new_repr = S.find_set(new_repr);
                    }
                    min[new_repr] = cycle_root;
                    roots.push_back(new_repr);
                    cycle[new_repr].swap(cycle_edges);

                    //!! TODO !! Needs to be changed for sparse graphs.
                    BOOST_FOREACH (vertex_idx_t v, cycle_repr)
                    {
                        BOOST_FOREACH (EdgeNode *en, in_edges[v])
                        {
                            en->weight += edge_weight_change[v];
                        }
                    }

                    // Merge all in_edges of the cycle into one list.
                    //!! TODO !! needs to be changed for sparse graphs.
                    std::vector<EdgeNode *> new_in_edges;
                    for (unsigned i = 1; i < cycle_repr.size(); ++i)
                    {
                        typedef typename std::vector<EdgeNode *>::iterator Iter;
                        Iter i1 = in_edges[cycle_repr[i]].begin();
                        Iter e1 = in_edges[cycle_repr[i]].end();
                        Iter i2 = in_edges[cycle_repr[i-1]].begin();
                        Iter e2 = in_edges[cycle_repr[i-1]].end();
                     
                        ///*
                        while (i1 != e1 || i2 != e2)
                        {
                            while (i1 != e1 && S.find_set((*i1)->source) == new_repr)
                            {
                                ++i1;
                            }
                            while (i2 != e2 && S.find_set((*i2)->source) == new_repr)
                            {
                                ++i2;
                            }

                            if (i1 == e1 && i2 == e2)
                                break;

                            if (i1 == e1)
                            {
                                new_in_edges.push_back(*i2);
                                ++i2;
                            }
                            else if (i2 == e2)
                            {
                                new_in_edges.push_back(*i1);
                                ++i1;
                            }
                            else if (((*i1)->source) < ((*i2)->source))
                            {
                                new_in_edges.push_back(*i1);
                                ++i1;
                            }
                            else if ((*i1)->source > (*i2)->source)
                            {
                                new_in_edges.push_back(*i2);
                                ++i2;
                            }
                            else // if the sources are equal
                            {
                                bool i1_is_better = TOptimumIsMaximum ?
                                    (*i1)->weight > (*i2)->weight :
                                    (*i1)->weight < (*i2)->weight;
                                if (i1_is_better)
                                {
                                    new_in_edges.push_back(*i1);
                                }
                                else
                                {
                                    new_in_edges.push_back(*i2);
                                }
                                ++i1;
                                ++i2;
                            }
                        }
                        in_edges[cycle_repr[i]].swap(new_in_edges);
                        new_in_edges.clear();
                    }
                    in_edges[new_repr].swap(in_edges[cycle_repr.back()]);
                    edge_weight_change[new_repr] = weight_t(0);
                    //*/
                }
            } // while (!roots.empty())
            
            // Extract the optimum branching

            // Find all roots of F.
            std::vector<EdgeNode *> F_roots;
            BOOST_FOREACH (EdgeNode *en, F)
            {
                if (en->parent == 0)
                {
                    F_roots.push_back(en);
                }
            }

            // Remove edges entering the root nodes.
            BOOST_FOREACH (vertex_idx_t v, final_roots)
            {
                if (lambda[v] != 0)
                {
                    remove_from_F(lambda[v], F_roots);
                }
            }
            
            while (!F_roots.empty())
            {
                EdgeNode *en = F_roots.back(); F_roots.pop_back();
                if (en->removed_from_F)
                    continue;

                *out = en->edge;
                ++out;
                remove_from_F(lambda[en->target], F_roots);
            }
        }

    };
}

template <bool TOptimumIsMaximum,
          bool TAttemptToSpan,
          bool TGraphIsDense,
          class TEdgeListGraph,
          class TVertexIndexMap,
          class TWeightMap,
          class TInputIterator,
          class TOutputIterator>
void
edmonds_optimum_branching(TEdgeListGraph &g,
                          TVertexIndexMap index,
                          TWeightMap weight,
                          TInputIterator roots_begin,
                          TInputIterator roots_end,
                          TOutputIterator out)
{
    using namespace boost;

    typedef typename graph_traits<TEdgeListGraph>::edge_descriptor    Edge;
    typedef typename graph_traits<TEdgeListGraph>::vertex_descriptor  Vertex;
    typedef typename graph_traits<TEdgeListGraph>::edge_iterator      EdgeIter;
    typedef typename property_traits<TWeightMap>::value_type          weight_t;

    function_requires< EdgeListGraphConcept<TEdgeListGraph> >();
    function_requires< ReadablePropertyMapConcept<TWeightMap, Edge> >();
    function_requires< ReadablePropertyMapConcept<TVertexIndexMap, Vertex> >();
    function_requires< InputIteratorConcept<TInputIterator> >();
    function_requires< OutputIteratorConcept<TOutputIterator, Edge> >();
    //!! Add the following requirements:
    // 
    // property_traits<TVertexIndexMap>::value_type is a built-in
    // integral type, or perhaps require that it can be used to index
    // into arrays.
    // 
    // property_traits<TWeightMap>::value_type is a numeric type that
    // handles the operations +, -, and <.
    // 
    // TInputIterator's value type is Vertex
    // TOutputIterator's value type is Edge
    

    ::detail::OptimumBranching<TOptimumIsMaximum, TAttemptToSpan,
        TGraphIsDense, TEdgeListGraph, TVertexIndexMap, TWeightMap,
        TInputIterator, TOutputIterator>
          optimum_branching(g, index, weight, roots_begin, roots_end, out);
    optimum_branching();
}
    



#endif // not EDMONDS_OPTIMUM_BRANCHING_IMPL_HPP

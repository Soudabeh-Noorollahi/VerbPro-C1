import { useEffect, useState } from "react";
import {useLazyQuery, useQuery, useMutation  } from "@apollo/client";
import { GET_CARDS, SEARCH_FLASHCARDS } from "../../graphql/queries/cardQueries";
import { DELETE_FLASHCARD } from "../../graphql/mutations/cardMutations";


export default function PaginatedFlashcards({
  searchTerm,
  setEditingCard,
  setModalOpen,
  toast,
}) {
  const [page , setPage] = useState(1);
  const limit = 12;
  
  const { loading, error, data, fetchMore , refetch } = useQuery(GET_CARDS, {
    variables: { page, limit },
    notifyOnNetworkStatusChange: true,
  });

  const [runSearch, { data: searchData, loading: searchLoading }] = useLazyQuery(
    SEARCH_FLASHCARDS
  );

  useEffect(() => {
    if (searchTerm.trim().length < 1) return;
    runSearch({ variables: { term: searchTerm } });
  }, [searchTerm, runSearch]);

  const flashcards = searchTerm.trim() ? searchData?.searchFlashcards || [] : data?.GetCards?.flashcards || [];
  
  const total = data?.GetCards?.total || 0;

  const [deleteFlashcardMutation] = useMutation(DELETE_FLASHCARD);

  const handleLoadMore = () => {
    fetchMore({
      variables: { page: page + 1, limit },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          GetCards: {
            __typename: "FlashcardPageResult",
            total: fetchMoreResult.GetCards.total,
            flashcards: [
              ...prev.GetCards.flashcards,
              ...fetchMoreResult.GetCards.flashcards,
            ],
          },
        };
      },
    });
    setPage((prev) => prev + 1);
  };

 const handleDelete = async (id) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this flashcard?"
  );
  if (!confirmed) return;

  try {
    await deleteFlashcardMutation({
      variables: { id },
      update: (cache) => {
        cache.modify({
          fields: {
            GetCards(
              existingData = { flashcards: [], total: 0 },
              { readField }
            ) {
              return {
                ...existingData,
                flashcards: existingData.flashcards.filter(
                  (fc) => readField("id", fc) !== id
                ),
                total: existingData.total - 1,
              };
            },
          },
        });
      },
    });
    toast.success("Flashcard deleted.");
    await refetch();
  } catch (err) {
    console.error("Delete failed:", err);
    toast.error("Delete failed.");
  }
};

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Paginated Flashcards</h3>


      {searchLoading && <p>Searching...</p>}
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error loading cards</p>}

      <ul className="space-y-2">
        {flashcards.map((card) => (
          <li key={card.id} className="bg-white border p-4 rounded shadow">
            <strong className="text-blue-600">{card.verb}</strong>{" "}
            {card.preposition} - {card.meaning}

             
              <p className={`text-sm mt-1 font-medium ${
    card.difficulty === "easy"
      ? "text-green-600"
      : card.difficulty === "medium"
      ? "text-yellow-600"
      : "text-red-600"
  }`}>
    Difficulty: {card.difficulty}
  </p>

            <div className="flex gap-2 mt-2">
              {" "}
              <button
                onClick={() => {
                  setEditingCard(card);
                  setModalOpen(true);
                }}
                className="text-blue-600 hover:underline text-sm"
              >
                ✏️ Edit
              </button>
          <button
            onClick={() => handleDelete(card.id)}
            className="text-red-600 hover:underline text-sm"
          >
            🗑️ Delete
          </button>
            </div>
          </li>
        ))}
      </ul>

      {searchTerm.trim() === "" && flashcards.length < total && (
        <div className="text-center mt-6">
          <button
            onClick={handleLoadMore}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

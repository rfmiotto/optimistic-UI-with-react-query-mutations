import React from "react";
import Axios from "axios";
import { IProduct } from "../../../types/IProduct";
import { useMutation, useQuery, useQueryClient } from "react-query";

const fetchProducts = () => {
  return Axios.get(`http://localhost:3333/products`).then(
    (response) => response.data
  );
};

const saveProduct = (product: IProduct) => {
  return Axios.post(`http://localhost:3333/products`, product).then(
    (response) => response.data
  );
};

type ProductsListProps = {
  onProductDetail: (id: number) => void;
};

export const ProductList = ({ onProductDetail }: ProductsListProps) => {
  const queryClient = useQueryClient()

  const queryKey = ["products"];

  const { data: products, isLoading } = useQuery<IProduct[]>(queryKey, () =>
    fetchProducts()
  );

  const mutation = useMutation(saveProduct, {
    onMutate: async (newProduct) => {
      // Cancel any other queries because now we need to focus on the one we
      // have just submitted
      await queryClient.cancelQueries(queryKey);

      // obtain the previous state, that is, the data we submitted
      const previousState = queryClient.getQueriesData(queryKey);

      // update current cache to include the new product
      queryClient.setQueryData<IProduct[]>(queryKey, (oldState) => {
        return [...(oldState  ?? []), newProduct];
      });

      // return the previous state in case some error occurs - this will be the
      // context
      return { previousState };
    },
    onError: async (err, variables, context) => {
      // get my previous state from the context
      const { previousState } = context as { previousState: IProduct[] };

      // if error occurs, I can recover the previous state
      queryClient.setQueryData(queryKey, previousState);
    },
    onSettled: async () => {
      // in case of either success or error, I invalidate the query to refetch
      // data from the server and make sure everything is okay
      await queryClient.invalidateQueries(queryKey);
    },
  });

  const handleSubmitNewProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  
    const formData = new FormData(event.currentTarget);
  
    const name = formData.get("name");
    const price = formData.get("price");
    const description = formData.get("description");
    const image = formData.get("image");
  
    const newProduct = {
      name,
      price,
      description,
      image,
    } as IProduct
  
    // saveProduct(newProduct);
    mutation.mutate(newProduct);
  };

  if (isLoading || !products) {
    return <h1>Loading products list ...</h1>;
  }

  return (
    <div className="container">
      <h1>Products List</h1>

      {/* 
      I am not using a specific library (react-hook-form, unform, etc.) to handle
      forms because that is not he scope of this code. Here, we want to focus on
      the mutation and not on the form itself. Here is the problem, and how we
      are going to solve it using the mutation:

      When we submit the form, it takes some time for the server to respond.
      As a consequence, the user doesn't see any UI change after hitting the
      submit button, which is not a good user experience. We want some 
      information to be displayed in the screen after pressing submit. In this
      case, we want the item to be added in the list even if that info was not
      saved in the server just yet.

      Mutation:
      1. React query updates the cache
      2. Re-render
      3. Wait for the server response

      Case success:
        Replace the old object by the new object
      
      Case Error:
        Remove the cached object
      */}
      <form onSubmit={handleSubmitNewProduct}>
        <input name="name" placeholder="Type the product name" />
        <input name="price" placeholder="Type the product price" />
        <input name="description" placeholder="Product description" />
        <input name="image" placeholder="Image of the product" />

        <button type="submit">Save product</button>
      </form>

      { mutation.isLoading && <p>Saving the product...</p> }

      <table>
        <thead>
          <tr>
            <th>Id</th>
            <th>Name</th>
            <th>Detail</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <tr key={product.id ?? new Date().getTime()}>
              <td>{product.id ?? "..."}</td>
              <td>{product.name}</td>
              <td>
                <a
                  href="#"
                  onClick={() => {
                    if (product.id) onProductDetail(product.id);
                  }}
                >
                  Detail
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

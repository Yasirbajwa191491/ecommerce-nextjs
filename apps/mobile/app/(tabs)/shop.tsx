import { ScreenContainer } from "@/components/layout/ScreenContainer";

import { Header } from "@/components/layout/Header";

import { ProductCatalogView } from "@/components/catalog/ProductCatalogView";

import { StyleSheet, View } from "react-native";

import { useScreenRootStyle } from "@/hooks/useScreenStyles";



export default function ShopScreen() {
  const rootStyle = useScreenRootStyle();

  return (

    <ScreenContainer>

      <View style={[styles.container, rootStyle]}>

        <Header title="Shop" showSearch={false} showWishlist showCompare />

        <ProductCatalogView showCategoryChips style={styles.catalog} />

      </View>

    </ScreenContainer>

  );

}



const styles = StyleSheet.create({

  container: {
    flex: 1,
  },
  catalog: {
    flex: 1,
  },
});


export interface GiftItem {
    // address: string;
    // name: string;
    // collection: {
    //     address: string;
    //     name: string;
    // };
    // price: number;
    // image: string;
    // ownerAddress: string;
    // actualOwnerAddress: string;

    type: 'gift' | 'money' | 'secret';
    price: number;
    image: string;
    name: string;
}
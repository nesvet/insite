import type {
	ComponentPropsWithoutRef,
	ComponentPropsWithRef,
	ElementType,
	ReactElement
} from "react";


export type PolymorphicRef<C extends ElementType> = ComponentPropsWithRef<C>["ref"];

export type PolymorphicProps<C extends ElementType, Props = object> = Omit<ComponentPropsWithoutRef<C>, keyof Props | "as"> & Props & { as?: C };

export type PolymorphicComponent<Default extends ElementType, Props = object> = {
	<C extends ElementType = Default>(props: PolymorphicProps<C, Props> & { ref?: PolymorphicRef<C> }): ReactElement | null;
	displayName?: string;
};

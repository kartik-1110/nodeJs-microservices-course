import { Column, Entity, ObjectIdColumn } from "typeorm";

@Entity()
export class product{
    @ObjectIdColumn()
    id: string;

    @Column({unique: true})
    admin_id: number;

     @Column()
    title: string;
    
    @Column()
    image: string;
    
    @Column()
    likes: number;
}
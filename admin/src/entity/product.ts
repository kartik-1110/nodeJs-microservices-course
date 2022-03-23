import {Column, Entity, PrimaryGeneratedColumn} from "typeorm"

@Entity()
export class product{
    // it is a primary key and is auto generated
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;
    
    @Column()
    image: string;
    
    @Column()
    likes: number;
}
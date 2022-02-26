public class SOQLInner {

    public static void test(){
        List<Opportunity> s = [select id, (select id, industry from accounts__r) from opportunity];
    }
}